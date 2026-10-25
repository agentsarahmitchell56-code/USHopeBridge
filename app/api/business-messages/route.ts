import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Business messaging is not configured.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function tokenMatches(token: unknown, expectedHash: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token) || typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
async function rateAllowed(request: NextRequest, purpose: string, limit: number) {
  if (!serviceKey) return false;
  const ip = clientIp(request);
  if (!ip) return false;
  const keyHash = createHmac("sha256", serviceKey).update(`business-message:${purpose}:${ip}`).digest("hex");
  const { data, error } = await adminClient().rpc("consume_upload_rate_limit", {
    p_key_hash: keyHash, p_limit: limit, p_window_seconds: 3600,
  });
  if (error) {
    console.error("Business messaging rate limiter unavailable:", error);
    return false;
  }
  return data === true;
}
function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) return badRequest("Business messaging is temporarily unavailable.", 503);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 12 * 1024) return badRequest("This message is too large.", 413);
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return badRequest("Check the message details and try again.");
    const input = raw as Record<string, unknown>;
    const db = adminClient();

    // Starting a conversation: only published pages can receive public messages.
    if (!input.conversation_id) {
      const slug = typeof input.slug === "string" ? input.slug.trim().toLowerCase() : "";
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const message = typeof input.message === "string" ? input.message.trim() : "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return badRequest("This business page could not be found.");
      if (name.length < 2 || name.length > 100) return badRequest("Enter your name using 2 to 100 characters.");
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Enter a valid email address.");
      if (message.length < 1 || message.length > 4000) return badRequest("Your message must contain 1 to 4,000 characters.");
      if (!await rateAllowed(request, "start", 8)) return badRequest("Too many new conversations from this connection. Please try again later.", 429);
      const { data: page, error: pageError } = await db.from("business_pages").select("id").eq("slug", slug).eq("published", true).maybeSingle();
      if (pageError || !page) return badRequest("This business page could not be found.", 404);
      const token = randomBytes(32).toString("hex");
      const { data: conversation, error: createError } = await db.from("business_page_conversations").insert({
        page_id: page.id, customer_name: name, customer_email: email, access_token_hash: hashToken(token),
      }).select("id").single();
      if (createError || !conversation) {
        console.error("Business conversation creation failed:", createError);
        return badRequest("We couldn't start this conversation. Please try again.", 500);
      }
      const { data: firstMessage, error: messageError } = await db.from("business_page_messages").insert({
        conversation_id: conversation.id, sender_type: "customer", sender_id: null, body: message,
      }).select("id,sender_type,body,created_at").single();
      if (messageError || !firstMessage) {
        await db.from("business_page_conversations").delete().eq("id", conversation.id);
        console.error("Initial business message failed:", messageError);
        return badRequest("We couldn't send your message. Please try again.", 500);
      }
      return NextResponse.json({ conversation_id: conversation.id, access_token: token, messages: [firstMessage] }, { status: 201 });
    }

    // Existing customer session: opaque bearer token grants access only to this conversation.
    const conversationId = typeof input.conversation_id === "string" ? input.conversation_id : "";
    const token = typeof input.access_token === "string" ? input.access_token : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !/^[a-f0-9]{64}$/i.test(token)) return badRequest("Invalid conversation session.", 401);
    const { data: conversation, error } = await db.from("business_page_conversations").select("id,access_token_hash").eq("id", conversationId).maybeSingle();
    if (error || !conversation || !tokenMatches(token, conversation.access_token_hash)) return badRequest("We couldn't verify this conversation. Reopen it using the original device and session.", 401);
    if (message.length < 1 || message.length > 4000) return badRequest("Your message must contain 1 to 4,000 characters.");
    if (!await rateAllowed(request, "reply", 60)) return badRequest("Too many messages from this connection. Please try again later.", 429);
    const { data: sent, error: sendError } = await db.from("business_page_messages").insert({
      conversation_id: conversation.id, sender_type: "customer", sender_id: null, body: message,
    }).select("id,sender_type,body,created_at").single();
    if (sendError || !sent) {
      console.error("Business customer reply failed:", sendError);
      return badRequest("Your message could not be sent. Please try again.", 500);
    }
    return NextResponse.json({ message: sent }, { status: 201 });
  } catch (error) {
    console.error("Business message POST failed:", error);
    return badRequest("Business messaging is temporarily unavailable.", 503);
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) return badRequest("Business messaging is temporarily unavailable.", 503);
    const conversationId = request.nextUrl.searchParams.get("conversation_id") || "";
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !/^[a-f0-9]{64}$/i.test(token)) return badRequest("Invalid conversation session.", 401);
    const db = adminClient();
    const { data: conversation, error } = await db.from("business_page_conversations").select("id,access_token_hash").eq("id", conversationId).maybeSingle();
    if (error || !conversation || !tokenMatches(token, conversation.access_token_hash)) return badRequest("We couldn't verify this conversation.", 401);
    const { data: messages, error: messagesError } = await db.from("business_page_messages").select("id,sender_type,body,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    if (messagesError) return badRequest("Conversation history could not load.", 500);
    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Business message GET failed:", error);
    return badRequest("Business messaging is temporarily unavailable.", 503);
  }
}
