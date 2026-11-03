import { createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const extByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "";
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Secure upload storage is not configured." }, { status: 503 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const purpose = input.purpose === "chat" ? "chat" : "";
    const audience = input.audience === "staff" ? "staff" : "customer";
    const mediaType = typeof input.mediaType === "string" ? input.mediaType : "";
    const size = typeof input.size === "number" ? input.size : 0;
    const conversationId = typeof input.conversationId === "string" ? input.conversationId : "";
    const chatToken = typeof input.chatToken === "string" ? input.chatToken : "";
    const isImage = mediaType.startsWith("image/");
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (purpose !== "chat" || !extByType[mediaType] || size < 1 || size > maxBytes) {
      return NextResponse.json({ error: "Images: JPG, PNG, or WebP up to 5 MB. Videos: MP4, WebM, or MOV up to 25 MB." }, { status: 400 });
    }
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) {
      return NextResponse.json({ error: "A valid chat session is required." }, { status: 401 });
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: conversation } = await db.from("conversations")
      .select("id,chat_token").eq("id", conversationId).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    if (audience === "staff") {
      const bearer = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
      if (!bearer) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
      const { data: authData, error: authError } = await db.auth.getUser(bearer);
      if (authError || !authData.user) return NextResponse.json({ error: "Staff session expired." }, { status: 401 });
      const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
      if (!profile || !["admin", "agent"].includes(profile.role)) {
        return NextResponse.json({ error: "Staff access required." }, { status: 403 });
      }
    } else if (!chatToken || conversation.chat_token !== chatToken) {
      return NextResponse.json({ error: "Invalid chat session." }, { status: 403 });
    }

    const ip = clientIp(request);
    if (!ip) return NextResponse.json({ error: "Upload could not be safely rate-limited." }, { status: 503 });
    const keyHash = createHmac("sha256", serviceKey)
      .update("upload:chat:" + ip).digest("hex");
    const { data: allowed, error: limitError } = await db.rpc("consume_upload_rate_limit", {
      p_key_hash: keyHash, p_limit: 20, p_window_seconds: 3600,
    });
    if (limitError) return NextResponse.json({ error: "Upload rate limiting is unavailable." }, { status: 503 });
    if (allowed !== true) return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });

    const path = "chat/" + randomUUID() + "." + extByType[mediaType];
    const { data, error } = await db.storage.from("hopebridge-private-uploads").createSignedUploadUrl(path);
    if (error || !data?.token) {
      console.error("Could not create signed chat upload:", error);
      return NextResponse.json({ error: "Could not prepare secure upload. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ path, token: data.token, mediaType }, { status: 201 });
  } catch (error) {
    console.error("Signed chat upload preparation failed:", error);
    return NextResponse.json({ error: "Secure uploads are temporarily unavailable." }, { status: 503 });
  }
}
