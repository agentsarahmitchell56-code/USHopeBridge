import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 64 * 1024;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Secure upload storage is not configured.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function clientIp(request: NextRequest) {
  // Vercel supplies x-real-ip; x-forwarded-for is a fallback for other trusted proxies.
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
  if (type === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function allowUpload(db: ReturnType<typeof adminClient>, request: NextRequest, purpose: "application" | "chat") {
  if (!serviceKey) throw new Error("Upload rate limiting is not configured.");
  const ip = clientIp(request);
  if (!ip) throw new Error("The request could not be rate-limited safely.");
  // Store only a keyed digest, never the raw IP address.
  const keyHash = createHmac("sha256", serviceKey).update(`upload:${purpose}:${ip}`).digest("hex");
  const { data, error } = await db.rpc("consume_upload_rate_limit", {
    p_key_hash: keyHash,
    p_limit: purpose === "application" ? 5 : 20,
    p_window_seconds: 3600,
  });
  if (error) throw new Error("Upload rate limiting is not available.");
  return data === true;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_MULTIPART_BYTES) {
      return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image up to 5 MB." }, { status: 413 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "");
    if (!(file instanceof File) || !["application", "chat"].includes(purpose)) {
      return NextResponse.json({ error: "Choose a valid image and upload destination." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type) || file.size < 1 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image up to 5 MB." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasExpectedSignature(file.type, bytes)) {
      return NextResponse.json({ error: "The image contents do not match the selected file type." }, { status: 415 });
    }

    const db = adminClient();
    const validPurpose = purpose as "application" | "chat";
    let folder = "applications";
    if (validPurpose === "chat") {
      const conversationId = String(form.get("conversationId") || "");
      const chatToken = String(form.get("chatToken") || "");
      if (!conversationId || !chatToken) return NextResponse.json({ error: "Chat session required." }, { status: 401 });
      const { data: conversation } = await db.from("conversations").select("id,chat_token").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
      if (!conversation) return NextResponse.json({ error: "Invalid chat session." }, { status: 403 });
      folder = "chat";
    }

    if (!(await allowUpload(db, request, validPurpose))) {
      return NextResponse.json(
        { error: "Too many uploads from this connection. Please try again in about an hour." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const path = folder + "/" + crypto.randomUUID() + "." + extByType[file.type];
    const { error } = await db.storage.from("hopebridge-private-uploads").upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: "The image could not be saved. Please try again." }, { status: 500 });
    return NextResponse.json({ path, type: file.type });
  } catch (error) {
    console.error("Private upload failed:", error);
    return NextResponse.json({ error: "Secure uploads are temporarily unavailable. Please try again later." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path") || "";
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    const conversationId = request.nextUrl.searchParams.get("conversationId") || "";
    const chatToken = request.nextUrl.searchParams.get("chatToken") || "";
    if (!/^(applications|chat)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)) {
      return NextResponse.json({ error: "Access denied." }, { status: 401 });
    }

    const db = adminClient();
    if (path.startsWith("chat/") && conversationId && chatToken) {
      const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
      if (!conversation) return NextResponse.json({ error: "Access denied." }, { status: 403 });
      const { data: attachment } = await db.from("messages").select("id").eq("conversation_id", conversationId).eq("image_path", path).maybeSingle();
      if (!attachment) return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
    } else {
      if (!bearer) return NextResponse.json({ error: "Access denied." }, { status: 401 });
      const { data: authData, error: authError } = await db.auth.getUser(bearer);
      if (authError || !authData.user) return NextResponse.json({ error: "Access denied." }, { status: 401 });
      const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
      if (!profile || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { data, error } = await db.storage.from("hopebridge-private-uploads").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: "Image could not be opened." }, { status: 500 });
  }
}
