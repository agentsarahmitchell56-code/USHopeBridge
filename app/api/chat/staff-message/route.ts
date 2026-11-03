import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendHopebridgePush } from "../../../../lib/notification-delivery";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!bearer) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Chat service is not configured." }, { status: 503 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await db.auth.getUser(bearer);
    if (authError || !authData.user) return NextResponse.json({ error: "Staff session expired." }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (!profile || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Staff access required." }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const conversationId = typeof input.conversationId === "string" ? input.conversationId : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    const mediaPath = typeof input.mediaPath === "string" ? input.mediaPath : "";
    const mediaType = typeof input.mediaType === "string" ? input.mediaType : "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || (!message && !mediaPath) || message.length > 5000) {
      return NextResponse.json({ error: "Add a message or attachment." }, { status: 400 });
    }
    if (mediaPath) {
      const allowed = /^chat\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(mediaPath);
      const typeAllowed = /^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(mediaType);
      if (!allowed || !typeAllowed || !mediaPath.startsWith("chat/")) return NextResponse.json({ error: "Unsupported attachment." }, { status: 400 });
    }
    const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const { data: saved, error: insertError } = await db.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: authData.user.id,
      message,
      image_path: mediaPath || null,
      image_type: mediaType || null,
    }).select("id,conversation_id,sender_type,sender_id,message,created_at,image_path,image_type").single();
    if (insertError || !saved) {
      console.error("Staff media message save failed:", insertError);
      return NextResponse.json({ error: "The message could not be saved. Please try again." }, { status: 500 });
    }
    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    await sendHopebridgePush(
      { conversationId },
      { title: "HOPEBRIDGE Support", body: message || (mediaType.startsWith("video/") ? "Sent you a video attachment." : "Sent you an image attachment."), url: "/chat", tag: "hopebridge-customer-reply" },
    );
    return NextResponse.json({ message: saved }, { status: 201 });
  } catch (error) {
    console.error("Staff chat message failed:", error);
    return NextResponse.json({ error: "The message could not be sent. Please try again." }, { status: 500 });
  }
}
