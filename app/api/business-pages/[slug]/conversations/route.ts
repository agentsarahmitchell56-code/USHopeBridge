import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { businessChatAdmin, hashBusinessChatToken, rateLimitBusinessChat, chatError } from "../../../../../lib/business-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return chatError("Enter your name and email to start a conversation.", 400);
    const input = body as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (name.length < 2 || name.length > 100) return chatError("Enter your name using 2 to 100 characters.", 400);
    if (email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return chatError("Enter a valid email address.", 400);

    const db = businessChatAdmin();
    const allowed = await rateLimitBusinessChat(db, request, "start", 8, 3600);
    if (!allowed) return chatError("Too many new conversations. Please try again later.", 429);
    const { data: page, error: pageError } = await db.from("business_pages")
      .select("id").eq("slug", slug).eq("published", true).maybeSingle();
    if (pageError || !page) return chatError("This business profile is unavailable.", 404);

    const accessToken = randomUUID();
    const { data: conversation, error } = await db.from("business_page_conversations")
      .insert({ page_id: page.id, customer_name: name, customer_email: email, access_token_hash: hashBusinessChatToken(accessToken) })
      .select("id,created_at").single();
    if (error || !conversation) {
      console.error("Business conversation creation failed:", error);
      return chatError("We could not start this conversation. Please try again.", 500);
    }
    return NextResponse.json({ conversationId: conversation.id, accessToken }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Business conversation start failed:", error);
    return chatError("Business messaging is temporarily unavailable.", 503);
  }
}
