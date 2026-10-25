import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token || !supabaseUrl || !serviceKey) return NextResponse.json({ error: "Sign in to view this conversation." }, { status: 401 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    const { conversationId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
    const { data: conversation, error: conversationError } = await db.from("business_page_conversations").select("id,page_id").eq("id", conversationId).maybeSingle();
    if (conversationError || !conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const { data: page, error: pageError } = await db.from("business_pages").select("id").eq("id", conversation.page_id).eq("owner_id", auth.user.id).maybeSingle();
    if (pageError || !page) return NextResponse.json({ error: "You do not have access to this conversation." }, { status: 403 });
    const { data: messages, error: messagesError } = await db.from("business_page_messages").select("id,sender_type,body,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (messagesError) return NextResponse.json({ error: "Conversation history could not load." }, { status: 500 });
    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Business conversation detail failed:", error);
    return NextResponse.json({ error: "Business messaging is temporarily unavailable." }, { status: 503 });
  }
}
