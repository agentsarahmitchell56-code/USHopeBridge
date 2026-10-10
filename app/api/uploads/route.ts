import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Secure upload storage is not configured.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "");
    if (!(file instanceof File) || !["application", "chat"].includes(purpose)) {
      return NextResponse.json({ error: "Choose a valid image and upload destination." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image up to 5 MB." }, { status: 400 });
    }
    const db = adminClient();
    let folder = "applications";
    if (purpose === "chat") {
      const conversationId = String(form.get("conversationId") || "");
      const chatToken = String(form.get("chatToken") || "");
      if (!conversationId || !chatToken) return NextResponse.json({ error: "Chat session required." }, { status: 401 });
      const { data: conversation } = await db.from("conversations").select("id,chat_token").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
      if (!conversation) return NextResponse.json({ error: "Invalid chat session." }, { status: 403 });
      folder = "chat";
    }
    const path = folder + "/" + crypto.randomUUID() + "." + extByType[file.type];
    const { error } = await db.storage.from("hopebridge-private-uploads").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: "The image could not be saved. Please try again." }, { status: 500 });
    return NextResponse.json({ path, type: file.type });
  } catch (error) {
    console.error("Private upload failed:", error);
    return NextResponse.json({ error: "Secure uploads are not configured yet. Please contact the site administrator." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path") || "";
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    const conversationId = request.nextUrl.searchParams.get("conversationId") || "";
    const chatToken = request.nextUrl.searchParams.get("chatToken") || "";
    if (!path) return NextResponse.json({ error: "Access denied." }, { status: 401 });
    const db = adminClient();
    const safePath = path.replace(/^\\/+/, "");
    if (safePath.startsWith("chat/") && conversationId && chatToken) {
      const { data: conversation } = await db.from("conversations").select("id").eq("id", conversationId).eq("chat_token", chatToken).maybeSingle();
      if (!conversation) return NextResponse.json({ error: "Access denied." }, { status: 403 });
      const { data: attachment } = await db.from("messages").select("id").eq("conversation_id", conversationId).eq("image_path", safePath).maybeSingle();
      if (!attachment) return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
    } else {
      if (!bearer) return NextResponse.json({ error: "Access denied." }, { status: 401 });
      const { data: authData, error: authError } = await db.auth.getUser(bearer);
      if (authError || !authData.user) return NextResponse.json({ error: "Access denied." }, { status: 401 });
      const { data: profile } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
      if (!profile || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
      if (!safePath.startsWith("applications/") && !safePath.startsWith("chat/")) return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }
    const { data, error } = await db.storage.from("hopebridge-private-uploads").createSignedUrl(safePath, 60);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: "Image could not be opened." }, { status: 500 });
  }
}
