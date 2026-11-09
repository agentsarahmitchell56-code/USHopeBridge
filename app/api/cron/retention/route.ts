import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { businessChatAdmin, BUSINESS_CHAT_BUCKET } from "../../../../lib/business-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_MONTHS = 12;
const BATCH_SIZE = 100;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Retention job is not configured." }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const db = businessChatAdmin();
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setUTCDate(1);
    cutoffDate.setUTCFullYear(now.getUTCFullYear() - 1);
    cutoffDate.setUTCMonth(now.getUTCMonth());
    const lastDayOfCutoffMonth = new Date(Date.UTC(cutoffDate.getUTCFullYear(), cutoffDate.getUTCMonth() + 1, 0)).getUTCDate();
    cutoffDate.setUTCDate(Math.min(now.getUTCDate(), lastDayOfCutoffMonth));
    cutoffDate.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    const cutoff = cutoffDate.toISOString();
    const { data: expired, error: lookupError } = await db.rpc("get_expired_business_conversations", {
      p_cutoff: cutoff,
      p_limit: BATCH_SIZE,
    });

    if (lookupError) {
      console.error("Retention candidate lookup failed:", lookupError);
      return NextResponse.json({ error: "Retention candidates could not be loaded." }, { status: 500 });
    }

    let deletedConversations = 0;
    let deletedAttachments = 0;
    let failedConversations = 0;

    for (const item of (expired || []) as Array<{ conversation_id: string; attachment_paths: string[] | null }>) {
      const conversationId = item.conversation_id;
      const paths = Array.isArray(item.attachment_paths) ? item.attachment_paths.filter(Boolean) : [];

      if (paths.length) {
        const { error: storageError } = await db.storage.from(BUSINESS_CHAT_BUCKET).remove(paths);
        if (storageError) {
          failedConversations += 1;
          console.error("Expired conversation attachment cleanup failed:", conversationId, storageError);
          continue;
        }
      }

      const { error: messagesError } = await db
        .from("business_page_messages")
        .delete()
        .eq("conversation_id", conversationId);
      if (messagesError) {
        failedConversations += 1;
        console.error("Expired conversation message cleanup failed:", conversationId, messagesError);
        continue;
      }

      const { error: conversationError } = await db
        .from("business_page_conversations")
        .delete()
        .eq("id", conversationId);
      if (conversationError) {
        failedConversations += 1;
        console.error("Expired conversation record cleanup failed:", conversationId, conversationError);
        continue;
      }

      deletedConversations += 1;
      deletedAttachments += paths.length;
    }

    return NextResponse.json({
      success: failedConversations === 0,
      cutoff,
      examined: (expired || []).length,
      deletedConversations,
      deletedAttachments,
      failedConversations,
      batchLimit: BATCH_SIZE,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Platform retention job failed:", error);
    return NextResponse.json({ error: "Retention cleanup failed." }, { status: 500 });
  }
}
