import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    if (!bearer) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Secure uploads are not configured." }, { status: 503 });

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await db.auth.getUser(bearer);
    if (authError || !authData.user) return NextResponse.json({ error: "Staff session expired." }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (!profile || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Staff access required." }, { status: 403 });

    const body = await request.json() as Record<string, unknown>;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;
    const isImage = IMAGE_TYPES.has(contentType);
    const isVideo = VIDEO_TYPES.has(contentType);
    const maxSize = isImage ? 5 * 1024 * 1024 : isVideo ? 25 * 1024 * 1024 : 0;

    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !maxSize || size < 1 || size > maxSize) {
      return NextResponse.json({ error: "Choose a supported JPG, PNG, WebP, MP4, WebM, or MOV file within the size limit." }, { status: 400 });
    }
    const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "";
    if (!ip) return NextResponse.json({ error: "Upload could not be rate-limited safely." }, { status: 400 });
    const keyHash = createHmac("sha256", serviceKey).update(`upload:chat:${ip}`).digest("hex");
    const { data: allowed, error: rateError } = await db.rpc("consume_upload_rate_limit", {
      p_key_hash: keyHash, p_limit: 20, p_window_seconds: 3600,
    });
    if (rateError) return NextResponse.json({ error: "Upload rate limiting is unavailable." }, { status: 503 });
    if (allowed !== true) return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });

    const path = `chat/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
    const { data, error } = await db.storage.from("hopebridge-private-uploads").createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token) {
      console.error("Could not create signed chat upload:", error);
      return NextResponse.json({ error: "Could not prepare secure media upload." }, { status: 503 });
    }
    return NextResponse.json({ path, token: data.token, contentType, mediaKind: isVideo ? "video" : "image" });
  } catch (error) {
    console.error("Signed chat upload preparation failed:", error);
    return NextResponse.json({ error: "Secure upload could not be prepared. Please try again." }, { status: 500 });
  }
}
