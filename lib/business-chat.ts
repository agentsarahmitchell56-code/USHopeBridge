import { createHmac } from "node:crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const BUSINESS_CHAT_BUCKET = "business-private-media";

export function businessChatAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Business messaging is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hashBusinessChatToken(token: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Business messaging is not configured.");
  return createHmac("sha256", key).update(`business-chat:${token}`).digest("hex");
}

export async function rateLimitBusinessChat(db: SupabaseClient, request: NextRequest, purpose: string, limit: number, windowSeconds: number) {
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "";
  if (!ip) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const keyHash = createHmac("sha256", key).update(`business-chat-rate:${purpose}:${ip}`).digest("hex");
  const { data, error } = await db.rpc("consume_upload_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

export async function authorizedBusinessOwner(request: NextRequest, db: SupabaseClient) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user) return null;
  return data.user;
}

export function chatError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
