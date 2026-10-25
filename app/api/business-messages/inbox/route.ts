import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Business messaging is not configured.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
async function authorizedOwner(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer || !supabaseUrl || !serviceKey) return null;
  const db = adminClient();
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user) return null;
  return { db, userId: data.user.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizedOwner(request);
    if (!auth) return responseError("Sign in to view your business inbox.", 401);
    const { data: pages, error: pageError } = await auth.db.from("business_pages").select("id,name,slug").eq("owner_id", auth.userId);
    if (pageError) return responseError("Your business pages could not be loaded.", 500);
    const pageIds = (pages || []).map((page) => page.id);
    if (!pageIds.length) return NextResponse.json({ conversations: [] });
    const { data: conversations, error: conversationError } = await auth.db.from("business_page_conversations")
      .select("id,page_id,customer_name,customer_email,created_at,updated_at")
      .in("page_id", pageIds).order("updated_at", { ascending: false }).limit(100);
    if (conversationError) return responseError("Your inbox could not be loaded.", 500);
    const conversationIds = (conversations || []).map((item) => item.id);
    const { data: messages, error: messageError } = conversationIds.length
      ? await auth.db.from("business_page_messages").select("id,conversation_id,sender_type,body,created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (messageError) return responseError("Inbox messages could not be loaded.", 500);
    const pageMap = new Map((pages || []).map((page) => [page.id, page]));
    const lastMessage = new Map<string, { id: string; sender_type: string; body: string; created_at: string }>();
    for (const message of messages || []) if (!lastMessage.has(message.conversation_id)) lastMessage.set(message.conversation_id, message);
    return NextResponse.json({
      conversations: (conversations || []).map((conversation) => ({
        ...conversation,
        page: pageMap.get(conversation.page_id) || null,
        last_message: lastMessage.get(conversation.id) || null,
      })),
    });
  } catch (error) {
    console.error("Business inbox GET failed:", error);
    return responseError("Business messaging is temporarily unavailable.", 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizedOwner(request);
    if (!auth) return responseError("Sign in to reply to customers.", 401);
    const size = Number(request.headers.get("content-length") || 0);
    if (size > 8 * 1024) return responseError("This reply is too large.", 413);
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return responseError("Enter a reply and try again.");
    const input = body as Record<string, unknown>;
    const conversationId = typeof input.conversation_id === "string" ? input.conversation_id : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return responseError("Choose a valid conversation.");
    if (message.length < 1 || message.length > 4000) return responseError("Your reply must contain 1 to 4,000 characters.");
    const { data: conversation, error: conversationError } = await auth.db.from("business_page_conversations")
      .select("id,page_id").eq("id", conversationId).maybeSingle();
    if (conversationError || !conversation) return responseError("This conversation could not be found.", 404);
    const { data: page, error: pageError } = await auth.db.from("business_pages")
      .select("id,owner_id").eq("id", conversation.page_id).eq("owner_id", auth.userId).maybeSingle();
    if (pageError || !page) return responseError("You do not have permission to reply to this conversation.", 403);
    const keyHash = createHmac("sha256", serviceKey || "").update(`business-owner-reply:${auth.userId}`).digest("hex");
    const { data: allowed, error: limitError } = await auth.db.rpc("consume_upload_rate_limit", {
      p_key_hash: keyHash, p_limit: 120, p_window_seconds: 3600,
    });
    if (limitError || allowed !== true) {
      if (limitError) console.error("Business owner reply rate limiter unavailable:", limitError);
      return responseError("Replies are temporarily rate-limited. Please try again later.", limitError ? 503 : 429);
    }
    const { data: sent, error: sendError } = await auth.db.from("business_page_messages").insert({
      conversation_id: conversation.id, sender_type: "business", sender_id: auth.userId, body: message,
    }).select("id,sender_type,body,created_at").single();
    if (sendError || !sent) {
      console.error("Business owner reply failed:", sendError);
      return responseError("Your reply could not be sent. Please try again.", 500);
    }
    return NextResponse.json({ message: sent }, { status: 201 });
  } catch (error) {
    console.error("Business inbox POST failed:", error);
    return responseError("Business messaging is temporarily unavailable.", 503);
  }
}
