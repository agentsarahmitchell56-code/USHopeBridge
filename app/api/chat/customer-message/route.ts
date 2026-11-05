import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const chatToken = typeof body.chatToken === "string" ? body.chatToken : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const mediaPath = typeof body.mediaPath === "string" ? body.mediaPath : "";
    const mediaType = typeof body.mediaType === "string" ? body.mediaType : "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !chatToken || (!message && !mediaPath) || message.length > 5000) {
      return NextResponse.json({ error: "Invalid chat message." }, { status: 400 });
    }
    if (mediaPath && (!/^chat\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(mediaPath) || !MEDIA_TYPES.has(mediaType))) {
      return NextResponse.json({ error: "Unsupported attachment." }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Chat service is not configured." }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "This chat session is no longer valid. Start a new chat." }, { status: 403 });
    const { data: saved, error } = await db.from("messages").insert({
      conversation_id: conversationId, sender_type: "client", sender_id: null, message,
      image_path: mediaPath || null, image_type: mediaType || null,
    }).select("id,conversation_id,sender_type,sender_id,message,created_at,image_path,image_type").single();
    if (error || !saved) {
      console.error("Customer media message save failed:", error);
      return NextResponse.json({ error: "The attachment uploaded, but the message could not be saved. Please retry sending." }, { status: 500 });
    }
    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ message: saved }, { status: 201 });
  } catch (error) {
    console.error("Customer chat message failed:", error);
    return NextResponse.json({ error: "The message could not be sent. Please try again." }, { status: 500 });
  }
}
