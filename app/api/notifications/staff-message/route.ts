import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendHopebridgeEmail, sendHopebridgePush } from "../../../../lib/notification-delivery";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const chatToken = typeof body.chatToken === "string" ? body.chatToken : "";
    const hasAttachment = body.hasAttachment === true;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (!conversationId || !chatToken || (!message && !hasAttachment)) {
      return NextResponse.json({ error: "A valid chat message is required." }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: conversation } = await db.from("conversations")
      .select("id,client_name,application_id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Chat session could not be verified." }, { status: 403 });

    const preview = message ? message.replace(/[\r\n]+/g, " ").slice(0, 180) : "Customer sent an image attachment.";
    await sendHopebridgeEmail(
      `New customer message from ${conversation.client_name}`,
      `A customer sent a new message in HOPEBRIDGE Support.\n\nCustomer: ${conversation.client_name}\nMessage: ${preview}\n\nOpen the staff inbox: https://us-hope-bridge.vercel.app/admin`,
    );
    const { data: staff } = await db.from("profiles").select("id").in("role", ["admin", "agent"]);
    await Promise.all((staff || []).map((person) => sendHopebridgePush(
      { staffUserId: person.id },
      { title: "New HOPEBRIDGE customer message", body: `${conversation.client_name}: ${preview}`, url: "/admin#support-inbox", tag: `message-${conversation.id}` },
    )));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Staff message notification failed:", error);
    return NextResponse.json({ error: "Message notification is temporarily unavailable." }, { status: 503 });
  }
}
