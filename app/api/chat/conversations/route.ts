import { createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "";
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) throw new Error("Chat is not configured.");
    const conversationId = request.nextUrl.searchParams.get("conversationId") || "";
    const chatToken = request.headers.get("x-chat-token") || "";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(conversationId) || !uuidPattern.test(chatToken)) {
      return NextResponse.json({ error: "Invalid chat session." }, { status: 400 });
    }
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: conversation, error } = await db.from("conversations")
      .select("application_id")
      .eq("id", conversationId)
      .eq("chat_token", chatToken)
      .maybeSingle();
    if (error || !conversation) return NextResponse.json({ error: "Invalid chat session." }, { status: 403 });
    if (!conversation.application_id) return NextResponse.json({ submitted: false }, { headers: { "Cache-Control": "no-store" } });
    const { data: application, error: applicationError } = await db.from("applications")
      .select("reference_number")
      .eq("id", conversation.application_id)
      .maybeSingle();
    if (applicationError || !application) return NextResponse.json({ submitted: true, reference_number: null }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ submitted: true, reference_number: application.reference_number }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chat application status lookup failed:", error);
    return NextResponse.json({ error: "Application status is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) throw new Error("Chat is not configured.");
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Enter your name and email to start chat." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Enter your name using 2 to 120 characters." }, { status: 400 });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const ip = clientIp(request);
    if (!ip) return NextResponse.json({ error: "We could not securely start chat. Please try again." }, { status: 503 });

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const keyHash = createHmac("sha256", serviceKey).update(`chat-start:${ip}`).digest("hex");
    const { data: allowed, error: limitError } = await db.rpc("consume_upload_rate_limit", {
      p_key_hash: keyHash,
      p_limit: 10,
      p_window_seconds: 3600,
    });
    if (limitError) {
      console.error("Chat rate limit unavailable:", limitError);
      return NextResponse.json({ error: "Chat is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    if (allowed !== true) {
      return NextResponse.json(
        { error: "Too many new chats from this connection. Please try again in about an hour." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const conversationId = randomUUID();
    const chatToken = randomUUID();
    const { error } = await db.from("conversations").insert({
      id: conversationId,
      client_name: name,
      client_email: email,
      chat_token: chatToken,
    });
    if (error) {
      console.error("Chat conversation insert failed:", error);
      return NextResponse.json({ error: "We couldn't start chat. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ conversation_id: conversationId, chat_token: chatToken }, { status: 201 });
  } catch (error) {
    console.error("Chat start failed:", error);
    return NextResponse.json({ error: "Chat is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
