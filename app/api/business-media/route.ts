import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (type === "image/gif") return bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)));
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (type === "video/mp4") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if (type === "video/webm") return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\\s+/i, "");
    if (!accessToken || accessToken === authorization) {
      return NextResponse.json({ error: "Please sign in again before uploading media." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Secure business uploads are not configured." }, { status: 503 });
    }

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await db.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your session could not be verified. Please sign in again." }, { status: 401 });
    }

    const form = await request.formData();
    const pageId = String(form.get("pageId") || "");
    const file = form.get("file");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId) || !(file instanceof File)) {
      return NextResponse.json({ error: "Choose a valid business and media file." }, { status: 400 });
    }

    const { data: page, error: pageError } = await db.from("business_pages").select("id").eq("id", pageId).eq("owner_id", authData.user.id).maybeSingle();
    if (pageError || !page) return NextResponse.json({ error: "You do not have permission to upload to this business." }, { status: 403 });

    const extension = ALLOWED_TYPES[file.type];
    if (!extension || file.size < 1 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Choose a JPG, PNG, WebP, GIF, MP4, or WebM file no larger than 25 MB." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(file.type, bytes)) {
      return NextResponse.json({ error: "The file contents do not match the selected file type." }, { status: 415 });
    }

    const path = pageId + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await db.storage.from("business-private-media").upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Business media upload failed:", uploadError);
      return NextResponse.json({ error: "The media could not be saved. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ path, type: file.type });
  } catch (error) {
    console.error("Business media upload request failed:", error);
    return NextResponse.json({ error: "The upload service could not complete the request. Please try again." }, { status: 500 });
  }
}
