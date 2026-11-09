import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { businessChatAdmin, hashBusinessChatToken, rateLimitBusinessChat, chatError, BUSINESS_CHAT_BUCKET } from "../../../../lib/business-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm",
};

async function verifyConversation(db: ReturnType<typeof businessChatAdmin>, id: string, token: string) {
  if (!uuidPattern.test(id) || !uuidPattern.test(token)) return null;
  const { data } = await db.from("business_page_conversations")
    .select("id,page_id,customer_name,customer_email")
    .eq("id", id).eq("access_token_hash", hashBusinessChatToken(token)).maybeSingle();
  return data;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const token = request.headers.get("x-business-chat-token") || "";
    const db = businessChatAdmin();
    const conversation = await verifyConversation(db, conversationId, token);
    if (!conversation) return chatError("This chat link is invalid or expired.", 403);
    await db.from("business_page_conversations").update({ customer_last_read_at: new Date().toISOString() }).eq("id", conversationId);
    const { data: rows, error } = await db.from("business_page_messages")
      .select("id,sender_type,body,attachment_path,attachment_type,created_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (error) return chatError("Messages could not be loaded. Please refresh.", 500);
    const messages = await Promise.all((rows || []).map(async (message: any) => {
      let attachmentUrl: string | null = null;
      if (message.attachment_path) {
        const { data } = await db.storage.from(BUSINESS_CHAT_BUCKET).createSignedUrl(message.attachment_path, 900);
        attachmentUrl = data?.signedUrl || null;
      }
      return { id: message.id, senderType: message.sender_type, body: message.body, attachmentType: message.attachment_type, attachmentUrl, createdAt: message.created_at };
    }));
    return NextResponse.json({ conversation: { id: conversation.id, customerName: conversation.customer_name }, messages }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer business chat read failed:", error);
    return chatError("Business messaging is temporarily unavailable.", 503);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  let uploadedPath: string | null = null;
  try {
    const { conversationId } = await params;
    const token = request.headers.get("x-business-chat-token") || "";
    const db = businessChatAdmin();
    const conversation = await verifyConversation(db, conversationId, token);
    if (!conversation) return chatError("This chat link is invalid or expired.", 403);
    if (!await rateLimitBusinessChat(db, request, "customer-message", 30, 60)) return chatError("You are sending messages too quickly. Please wait a moment.", 429);

    const form = await request.formData();
    const body = String(form.get("message") || "").trim();
    const file = form.get("file");
    let attachmentType: string | null = null;
    if (body.length > 4000) return chatError("Messages must be 4,000 characters or fewer.", 400);
    if (file && file instanceof File && file.size > 0) {
      attachmentType = file.type;
      const extension = allowedTypes[attachmentType];
      if (!extension || file.size > 25 * 1024 * 1024) return chatError("Attach a JPG, PNG, WebP, GIF, MP4, or WebM file up to 25 MB.", 400);
      uploadedPath = `business-chat/${conversationId}/${randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from(BUSINESS_CHAT_BUCKET).upload(uploadedPath, file, { contentType: attachmentType, upsert: false });
      if (uploadError) {
        console.error("Customer business chat upload failed:", uploadError);
        return chatError("The attachment could not be uploaded. Please try again.", 502);
      }
    }
    if (!body && !uploadedPath) return chatError("Write a message or attach a file.", 400);
    const { data, error } = await db.from("business_page_messages").insert({
      conversation_id: conversationId, sender_type: "customer", sender_id: null,
      body, attachment_path: uploadedPath, attachment_type: attachmentType,
    }).select("id,created_at").single();
    if (error || !data) {
      if (uploadedPath) await db.storage.from(BUSINESS_CHAT_BUCKET).remove([uploadedPath]);
      console.error("Customer business chat insert failed:", error);
      return chatError("Your message could not be sent. Please try again.", 500);
    }
    await db.from("business_page_conversations").update({ customer_last_read_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ message: { id: data.id, createdAt: data.created_at } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer business chat send failed:", error);
    return chatError("Business messaging is temporarily unavailable.", 503);
  }
}
