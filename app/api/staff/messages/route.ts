import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Staff messaging is not configured.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authorizedStaff(request: NextRequest, db: ReturnType<typeof adminClient>) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;

  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !["admin", "agent"].includes(profile.role)) return null;
  return data.user;
}

export async function GET(request: NextRequest) {
  try {
    const db = adminClient();
    const user = await authorizedStaff(request, db);
    if (!user) {
      return NextResponse.json(
        { error: "Your staff session is missing or expired. Please sign in again." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const conversationId = request.nextUrl.searchParams.get("conversationId");
    if (conversationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation reference." }, { status: 400 });
    }

    if (conversationId) {
      const { data: conversation, error: conversationError } = await db
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();

      if (conversationError) {
        console.error("Staff conversation verification failed:", conversationError);
        return NextResponse.json({ error: "The conversation could not be verified." }, { status: 500 });
      }
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }

      const { data: messages, error } = await db
        .from("messages")
        .select("id,conversation_id,sender_type,sender_id,message,created_at,image_path,image_type,video_path,video_type")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Staff conversation messages query failed:", error);
        return NextResponse.json({ error: "Messages could not be loaded. Please refresh and try again." }, { status: 500 });
      }

      return NextResponse.json(
        { messages: messages || [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: previews, error } = await db
      .from("messages")
      .select("conversation_id,message,sender_type,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Staff inbox message previews query failed:", error);
      return NextResponse.json({ error: "Message previews could not be loaded." }, { status: 500 });
    }

    return NextResponse.json(
      { messages: previews || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Staff messages API failed:", error);
    return NextResponse.json(
      { error: "Staff messaging is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const adminDb = adminClient();
    const user = await authorizedStaff(request, adminDb);
    if (!bearer || !user) return NextResponse.json({ error: "Your staff session is missing or expired. Please sign in again." }, { status: 401 });

    const body = await request.json();
    const conversationId = String(body.conversationId || "");
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const imagePath = body.imagePath == null ? null : String(body.imagePath);
    const imageType = body.imageType == null ? null : String(body.imageType);
    const videoPath = body.videoPath == null ? null : String(body.videoPath);
    const videoType = body.videoType == null ? null : String(body.videoType);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(conversationId) || message.length > 5000) return NextResponse.json({ error: "The conversation or message is invalid." }, { status: 400 });
    if (imagePath && (!/^chat\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(imagePath) || !["image/jpeg", "image/png", "image/webp"].includes(imageType || ""))) return NextResponse.json({ error: "The image attachment is invalid." }, { status: 400 });
    if (videoPath && (!/^chat\/[0-9a-f-]{36}\.(mp4|webm|mov)$/i.test(videoPath) || !["video/mp4", "video/webm", "video/quicktime"].includes(videoType || ""))) return NextResponse.json({ error: "The video attachment is invalid." }, { status: 400 });
    if (imagePath && videoPath) return NextResponse.json({ error: "Send one attachment at a time." }, { status: 400 });
    if (!message && !imagePath && !videoPath) return NextResponse.json({ error: "Write a message or attach a file." }, { status: 400 });

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) throw new Error("Staff message submission is not configured.");
    const userDb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const hasAttachment = Boolean(imagePath || videoPath);
    const rpcName = hasAttachment ? "send_staff_chat_attachment" : "send_staff_chat_message";
    const rpcArgs = hasAttachment
      ? { p_conversation_id: conversationId, p_message: message, p_image_path: imagePath, p_image_type: imageType, p_video_path: videoPath, p_video_type: videoType }
      : { p_conversation_id: conversationId, p_message: message };
    const { data, error } = await userDb.rpc(rpcName, rpcArgs);
    if (error || !data) {
      console.error("Staff message RPC failed:", { rpcName, code: error?.code, message: error?.message });
      return NextResponse.json({ error: error?.message || "The message could not be saved." }, { status: 502 });
    }
    return NextResponse.json({ messageId: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Staff message submission failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Staff messaging is temporarily unavailable." }, { status: 503 });
  }
}
