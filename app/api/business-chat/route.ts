import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { businessChatAdmin, authorizedBusinessOwner, rateLimitBusinessChat, chatError, BUSINESS_CHAT_BUCKET } from "../../../lib/business-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = businessChatAdmin();
    const user = await authorizedBusinessOwner(request, db);
    if (!user) return chatError("Your business session has expired. Please sign in again.", 401);
    const pageId = request.nextUrl.searchParams.get("pageId") || "";
    const conversationId = request.nextUrl.searchParams.get("conversationId") || "";
    if (!/^[0-9a-f-]{36}$/i.test(pageId)) return chatError("Select a valid business page.", 400);
    const { data: page } = await db.from("business_pages").select("id,name").eq("id", pageId).eq("owner_id", user.id).maybeSingle();
    if (!page) return chatError("You do not have access to this business page.", 403);

    if (conversationId) {
      const { data: conversation } = await db.from("business_page_conversations")
        .select("id,customer_name,customer_email").eq("id", conversationId).eq("page_id", pageId).maybeSingle();
      if (!conversation) return chatError("Conversation not found.", 404);
      const now = new Date().toISOString();
      await db.from("business_page_conversations").update({ business_last_read_at: now }).eq("id", conversationId);
      const { data: rows, error } = await db.from("business_page_messages")
        .select("id,sender_type,sender_id,body,attachment_path,attachment_type,created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
      if (error) return chatError("Messages could not be loaded.", 500);
      const messages = await Promise.all((rows || []).map(async (message: any) => {
        let attachmentUrl: string | null = null;
        if (message.attachment_path) {
          const { data } = await db.storage.from(BUSINESS_CHAT_BUCKET).createSignedUrl(message.attachment_path, 900);
          attachmentUrl = data?.signedUrl || null;
        }
        return { id: message.id, senderType: message.sender_type, body: message.body, attachmentType: message.attachment_type, attachmentUrl, createdAt: message.created_at };
      }));
      return NextResponse.json({ conversation, messages }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: conversations, error } = await db.from("business_page_conversations")
      .select("id,customer_name,customer_email,created_at,updated_at,business_last_read_at")
      .eq("page_id", pageId).order("updated_at", { ascending: false }).limit(100);
    if (error) return chatError("Your inbox could not be loaded.", 500);
    const inbox = await Promise.all((conversations || []).map(async (conversation: any) => {
      const { data: last } = await db.from("business_page_messages")
        .select("body,attachment_type,sender_type,created_at").eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      let unreadCount = 0;
      let unreadQuery = db.from("business_page_messages").select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id).eq("sender_type", "customer");
      if (conversation.business_last_read_at) unreadQuery = unreadQuery.gt("created_at", conversation.business_last_read_at);
      const unread = await unreadQuery;
      unreadCount = unread.count || 0;
      return { ...conversation, lastMessage: last?.body || (last?.attachment_type ? "Attachment" : ""), lastMessageAt: last?.created_at || conversation.updated_at, unreadCount };
    }));
    return NextResponse.json({ page, conversations: inbox }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Business inbox read failed:", error);
    return chatError("Business messaging is temporarily unavailable.", 503);
  }
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    const db = businessChatAdmin();
    const user = await authorizedBusinessOwner(request, db);
    if (!user) return chatError("Your business session has expired. Please sign in again.", 401);
    if (!await rateLimitBusinessChat(db, request, "business-message", 60, 60)) return chatError("You are sending messages too quickly. Please wait a moment.", 429);

    let pageId = "";
    let conversationId = "";
    let message = "";
    let file: File | null = null;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      pageId = String(form.get("pageId") || "");
      conversationId = String(form.get("conversationId") || "");
      message = String(form.get("message") || "").trim();
      const candidate = form.get("file");
      if (candidate instanceof File && candidate.size > 0) file = candidate;
    } else {
      const input: unknown = await request.json();
      if (!input || typeof input !== "object" || Array.isArray(input)) return chatError("Enter a message.", 400);
      const body = input as Record<string, unknown>;
      pageId = typeof body.pageId === "string" ? body.pageId : "";
      conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
      message = typeof body.message === "string" ? body.message.trim() : "";
    }
    if (!/^[0-9a-f-]{36}$/i.test(pageId) || !/^[0-9a-f-]{36}$/i.test(conversationId) || message.length > 4000) return chatError("Enter a message of up to 4,000 characters.", 400);
    if (file) {
      const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm" };
      const extension = types[file.type];
      if (!extension || file.size > 25 * 1024 * 1024) return chatError("Attach a JPG, PNG, WebP, GIF, MP4, or WebM file up to 25 MB.", 400);
      uploadedPath = `business-chat/${conversationId}/${randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from(BUSINESS_CHAT_BUCKET).upload(uploadedPath, file, { contentType: file.type, upsert: false });
      if (uploadError) return chatError("The attachment could not be uploaded. Please try again.", 502);
    }
    if (!message && !uploadedPath) return chatError("Write a message or attach a file.", 400);
    const { data: page } = await db.from("business_pages").select("id").eq("id", pageId).eq("owner_id", user.id).maybeSingle();
    if (!page) return chatError("You do not have access to this business page.", 403);
    const { data: conversation } = await db.from("business_page_conversations").select("id").eq("id", conversationId).eq("page_id", pageId).maybeSingle();
    if (!conversation) return chatError("Conversation not found.", 404);
    const { data, error } = await db.from("business_page_messages").insert({
      conversation_id: conversationId, sender_type: "business", sender_id: user.id, body: message,
      attachment_path: uploadedPath, attachment_type: file?.type || null,
    }).select("id,created_at").single();
    if (error || !data) {
      if (uploadedPath) await db.storage.from(BUSINESS_CHAT_BUCKET).remove([uploadedPath]);
      console.error("Business reply failed:", error);
      return chatError("Your reply could not be sent. Please try again.", 500);
    }
    await db.from("business_page_conversations").update({ business_last_read_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ message: { id: data.id, createdAt: data.created_at } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Business reply failed:", error);
    return chatError("Business messaging is temporarily unavailable.", 503);
  }
}
