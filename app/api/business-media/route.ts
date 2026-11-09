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

    const body = await request.json();
    const pageId = String(body.pageId || "");
    const fileType = String(body.fileType || "");
    const fileSize = Number(body.fileSize);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId)) {
      return NextResponse.json({ error: "Choose a valid business workspace." }, { status: 400 });
    }

    const { data: page, error: pageError } = await db.from("business_pages").select("id").eq("id", pageId).eq("owner_id", authData.user.id).maybeSingle();
    if (pageError || !page) return NextResponse.json({ error: "You do not have permission to upload to this business." }, { status: 403 });

    const extension = ALLOWED_TYPES[fileType];
    if (!extension || !Number.isFinite(fileSize) || fileSize < 1 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Choose a JPG, PNG, WebP, GIF, MP4, or WebM file no larger than 25 MB." }, { status: 400 });
    }

    const path = pageId + "/" + crypto.randomUUID() + "." + extension;
    const { data: signedUpload, error: signError } = await db.storage.from("business-private-media").createSignedUploadUrl(path);
    if (signError || !signedUpload?.token) {
      console.error("Business media upload signing failed:", signError);
      return NextResponse.json({ error: "A secure upload link could not be created. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ path, token: signedUpload.token });
  } catch (error) {
    console.error("Business media upload signing request failed:", error);
    return NextResponse.json({ error: "The upload service could not prepare this file. Please try again." }, { status: 500 });
  }
}
