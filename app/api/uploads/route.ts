import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Secure upload storage is not configured.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const fileTypes: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
};

function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "";
}

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (type === "video/mp4" || type === "video/quicktime") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if (type === "video/webm") return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return false;
}

async function allowUpload(db: ReturnType<typeof adminClient>, request: NextRequest, purpose: "application" | "chat") {
  if (!serviceKey) throw new Error("Upload rate limiting is not configured.");
  const ip = clientIp(request);
  if (!ip) throw new Error("The request could not be rate-limited safely.");
  const keyHash = createHmac("sha256", serviceKey).update(`upload:${purpose}:${ip}`).digest("hex");
  const { data, error } = await db.rpc("consume_upload_rate_limit", {
    p_key_hash: keyHash, p_limit: purpose === "application" ? 5 : 20, p_window_seconds: 3600,
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
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > VIDEO_MAX + 64 * 1024) return NextResponse.json({ error: "Files must be no larger than 25 MB." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "");
    if (!(file instanceof File) || !["application", "chat"].includes(purpose)) return NextResponse.json({ error: "Choose a valid file and upload destination." }, { status: 400 });
    const info = fileTypes[file.type];
    if (!info || file.size < 1 || file.size > (info.kind === "image" ? IMAGE_MAX : VIDEO_MAX)) {
      return NextResponse.json({ error: "Images must be JPG, PNG or WebP up to 5 MB. Videos must be MP4, WebM or MOV up to 25 MB." }, { status: 400 });
    }
    if (purpose === "application" && info.kind !== "image") return NextResponse.json({ error: "Application supporting files must be images." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasExpectedSignature(file.type, bytes)) return NextResponse.json({ error: "The file contents do not match the selected file type." }, { status: 415 });

    const db = adminClient();
    let folder = "applications";
    if (purpose === "chat") {
      const conversationId = String(form.get("conversationId") || "");
      const chatToken = String(form.get("chatToken") || "");
      if (chatToken) {
        const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
        if (!conversation) return NextResponse.json({ error: "Invalid chat session." }, { status: 403 });
      } else {
        const user = await authorizedStaff(db, request);
        if (!user) return NextResponse.json({ error: "A valid staff session is required." }, { status: 401 });
        const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).maybeSingle();
        if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }
      folder = "chat";
    }

    if (!(await allowUpload(db, request, purpose as "application" | "chat"))) return NextResponse.json(
      { error: "Too many uploads from this connection. Please try again in about an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );

    const path = folder + "/" + crypto.randomUUID() + "." + info.ext;
    const { error } = await db.storage.from("hopebridge-private-uploads").upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: "The file could not be saved. Please try again." }, { status: 500 });
    return NextResponse.json({ path, type: file.type, kind: info.kind });
  } catch (error) {
    console.error("Private upload failed:", error);
    return NextResponse.json({ error: "Secure uploads are temporarily unavailable. Please try again later." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path") || "";
    const conversationId = request.nextUrl.searchParams.get("conversationId") || "";
    const chatToken = request.nextUrl.searchParams.get("chatToken") || "";
    if (!/^(applications|chat)\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(path)) return NextResponse.json({ error: "Access denied." }, { status: 401 });

    const db = adminClient();
    const isImage = /\.(jpg|png|webp)$/i.test(path);
    if (path.startsWith("chat/") && conversationId && chatToken) {
      const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
      if (!conversation) return NextResponse.json({ error: "Access denied." }, { status: 403 });
      const { data: attachment } = isImage
        ? await db.from("messages").select("id").eq("conversation_id", conversationId).eq("image_path", path).maybeSingle()
        : await db.from("messages").select("id").eq("conversation_id", conversationId).eq("video_path", path).maybeSingle();
      if (!attachment) return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
    } else {
      const user = await authorizedStaff(db, request);
      if (!user) return NextResponse.json({ error: "Access denied." }, { status: 401 });
      if (path.startsWith("chat/")) {
        const { data: attachment } = isImage
          ? await db.from("messages").select("id").eq("image_path", path).maybeSingle()
          : await db.from("messages").select("id").eq("video_path", path).maybeSingle();
        if (!attachment) return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
      } else {
        const { data: attachment } = await db.from("applications").select("id").eq("attachment_path", path).maybeSingle();
        if (!attachment) return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
      }
    }
    const { data, error } = await db.storage.from("hopebridge-private-uploads").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: "Attachment could not be opened." }, { status: 500 });
  }
}
