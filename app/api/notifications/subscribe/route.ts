import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  if (!url || !serviceKey) throw new Error("Notifications are not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validSubscription(value: unknown): value is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const keys = item.keys as Record<string, unknown> | undefined;
  return typeof item.endpoint === "string"
    && item.endpoint.startsWith("https://")
    && item.endpoint.length <= 2048
    && !!keys
    && typeof keys.p256dh === "string" && keys.p256dh.length <= 256
    && typeof keys.auth === "string" && keys.auth.length <= 256;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!validSubscription(body.subscription)) {
      return NextResponse.json({ error: "A valid browser push subscription is required." }, { status: 400 });
    }

    const db = adminClient();
    const authorization = request.headers.get("authorization") || "";
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    let staffUserId: string | null = null;
    let conversationId: string | null = null;

    if (body.audience === "staff") {
      if (!bearer) return NextResponse.json({ error: "Staff sign-in is required." }, { status: 401 });
      const { data: authData, error: authError } = await db.auth.getUser(bearer);
      if (authError || !authData.user) return NextResponse.json({ error: "Staff session is invalid." }, { status: 401 });
      const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
      if (!profile || !["admin", "agent"].includes(profile.role)) {
        return NextResponse.json({ error: "Staff access is required." }, { status: 403 });
      }
      staffUserId = authData.user.id;
    } else if (body.audience === "customer") {
      const id = typeof body.conversationId === "string" ? body.conversationId : "";
      const token = typeof body.chatToken === "string" ? body.chatToken : "";
      if (!id || !token) return NextResponse.json({ error: "Your support chat session is required." }, { status: 401 });
      const { data: conversation } = await db.from("conversations")
        .select("id").eq("id", id).eq("chat_token", token).maybeSingle();
      if (!conversation) return NextResponse.json({ error: "Your support chat session could not be verified." }, { status: 403 });
      conversationId = conversation.id;
    } else {
      return NextResponse.json({ error: "Unknown notification audience." }, { status: 400 });
    }

    const { error } = await db.from("push_subscriptions").upsert({
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
      staff_user_id: staffUserId,
      conversation_id: conversationId,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) {
      console.error("Could not save push subscription:", error);
      return NextResponse.json({ error: "Could not save notification settings." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push subscription failed:", error);
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503 });
  }
}
