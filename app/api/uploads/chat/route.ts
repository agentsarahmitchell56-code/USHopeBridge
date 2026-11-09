import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedTypes: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
};

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Secure upload storage is not configured.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "";
}

async function allowChatUpload(db: ReturnType<typeof adminClient>, request: NextRequest) {
  if (!serviceKey) throw new Error("Upload rate limiting is not configured.");
  const ip = clientIp(request);
  if (!ip) throw new Error("The request could not be rate-limited safely.");
  const keyHash = createHmac("sha256", serviceKey).update(`upload:chat:${ip}`).digest("hex");
  const { data, error } = await db.rpc("consume_upload_rate_limit", {
    p_key_hash: keyHash, p_limit: 20, p_window_seconds: 3600,
  });
  if (error) throw new Error("Upload rate limiting is not available.");
  return data === true;
}

async function authorizedStaff(db: ReturnType<typeof adminClient>, request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user) return null;
  const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return profile && ["admin", "agent"].includes(profile.role) ? data.user : null;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Choose a valid attachment." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const conversationId = typeof input.conversationId === "string" ? input.conversationId : "";
    const chatToken = typeof input.chatToken === "string" ? input.chatToken : "";
    const fileType = typeof input.fileType === "string" ? input.fileType : "";
    const fileSize = Number(input.fileSize);
    const info = allowedTypes[fileType];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)
      || !info || !Number.isFinite(fileSize) || fileSize < 1
      || fileSize > (info.kind === "image" ? IMAGE_MAX : VIDEO_MAX)) {
      return NextResponse.json({ error: "Choose a supported image up to 5 MB or video up to 25 MB." }, { status: 400 });
    }

    const db = adminClient();
    if (chatToken) {
      const { data: conversation, error } = await db.from("conversations")
        .select("id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
      if (error || !conversation) return NextResponse.json({ error: "Invalid chat session." }, { status: 403 });
    } else {
      const user = await authorizedStaff(db, request);
      if (!user) return NextResponse.json({ error: "A valid staff session is required." }, { status: 401 });
      const { data: conversation, error } = await db.from("conversations").select("id").eq("id", conversationId).maybeSingle();
      if (error || !conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (!(await allowChatUpload(db, request))) {
      return NextResponse.json({ error: "Too many uploads from this connection. Please try again later." }, { status: 429 });
    }

    const path = `chat/${crypto.randomUUID()}.${info.ext}`;
    const { data, error } = await db.storage.from("hopebridge-private-uploads").createSignedUploadUrl(path);
    if (error || !data?.token) {
      console.error("HOPEBRIDGE chat upload signing failed:", error);
      return NextResponse.json({ error: "A secure upload link could not be created. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ path, token: data.token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("HOPEBRIDGE chat upload preparation failed:", error);
    return NextResponse.json({ error: "The attachment service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
