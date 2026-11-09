import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { businessChatAdmin, authorizedBusinessOwner, hashBusinessChatToken, rateLimitBusinessChat, chatError, BUSINESS_CHAT_BUCKET } from "../../../../lib/business-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm",
};

export async function POST(request: NextRequest) {
  try {
    const db = businessChatAdmin();
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return chatError("Choose a valid attachment.", 400);
    const body = input as Record<string, unknown>;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize = Number(body.fileSize);
    const extension = allowedTypes[fileType];
    if (!uuidPattern.test(conversationId) || !extension || !Number.isFinite(fileSize) || fileSize < 1 || fileSize > 25 * 1024 * 1024) {
      return chatError("Choose a JPG, PNG, WebP, GIF, MP4, or WebM file up to 25 MB.", 400);
    }

    const owner = await authorizedBusinessOwner(request, db);
    if (owner) {
      const pageId = typeof body.pageId === "string" ? body.pageId : "";
      if (!uuidPattern.test(pageId)) return chatError("Choose a valid business page.", 400);
      const { data: page } = await db.from("business_pages").select("id").eq("id", pageId).eq("owner_id", owner.id).maybeSingle();
      if (!page) return chatError("You do not have access to this business page.", 403);
      const { data: conversation } = await db.from("business_page_conversations").select("id").eq("id", conversationId).eq("page_id", pageId).maybeSingle();
      if (!conversation) return chatError("Conversation not found.", 404);
      if (!await rateLimitBusinessChat(db, request, "business-chat-upload", 20, 3600)) return chatError("Too many attachments. Please try again later.", 429);
    } else {
      const token = request.headers.get("x-business-chat-token") || "";
      if (!uuidPattern.test(token)) return chatError("This chat link is invalid or expired.", 403);
      const { data: conversation } = await db.from("business_page_conversations").select("id").eq("id", conversationId).eq("access_token_hash", hashBusinessChatToken(token)).maybeSingle();
      if (!conversation) return chatError("This chat link is invalid or expired.", 403);
      if (!await rateLimitBusinessChat(db, request, "customer-chat-upload", 20, 3600)) return chatError("Too many attachments. Please try again later.", 429);
    }

    const path = `business-chat/${conversationId}/${randomUUID()}.${extension}`;
    const { data, error } = await db.storage.from(BUSINESS_CHAT_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) {
      console.error("Business chat upload signing failed:", error);
      return chatError("A secure upload link could not be created. Please try again.", 502);
    }
    return NextResponse.json({ path, token: data.token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Business chat upload preparation failed:", error);
    return chatError("The attachment service is temporarily unavailable.", 503);
  }
}
