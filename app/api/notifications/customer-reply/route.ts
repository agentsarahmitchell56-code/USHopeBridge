import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendHopebridgePush } from "../../../../lib/notification-delivery";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Staff sign-in is required." }, { status: 401 });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Staff session is invalid." }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (!profile || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Staff access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    if (!conversationId) return NextResponse.json({ error: "Conversation is required." }, { status: 400 });
    const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversation was not found." }, { status: 404 });
    await sendHopebridgePush(
      { conversationId },
      { title: "New HOPEBRIDGE support reply", body: "Support sent you a new message. Open your chat to read it.", url: "/chat", tag: `chat-${conversationId}` },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not send customer push alert:", error);
    return NextResponse.json({ error: "Notification delivery is temporarily unavailable." }, { status: 503 });
  }
}
