import { createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedAssistanceTypes = new Set([
  "Emergency assistance",
  "Medical assistance",
  "Housing assistance",
  "Education assistance",
  "Other",
]);

function getClientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "";
}

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Application submission is not configured.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!serviceKey) throw new Error("Application submission is not configured.");
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 32 * 1024) {
      return NextResponse.json({ error: "The application is too large. Please shorten your answers." }, { status: 413 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Please check the application form and try again." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    const location = typeof input.location === "string" ? input.location.trim() : "";
    const assistanceType = typeof input.assistance_type === "string" ? input.assistance_type : "";
    const requestedAmount = typeof input.requested_amount === "string" ? input.requested_amount.trim() : "";
    const details = typeof input.details === "string" ? input.details.trim() : "";
    const attachmentPath = input.attachment_path == null ? null : String(input.attachment_path);

    if (fullName.length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: "Enter your full name using 2 to 120 characters." }, { status: 400 });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (phone.length > 40 || location.length > 120 || requestedAmount.length > 80) {
      return NextResponse.json({ error: "One of your answers is too long. Please review the form." }, { status: 400 });
    }
    if (!allowedAssistanceTypes.has(assistanceType)) {
      return NextResponse.json({ error: "Choose a valid assistance type." }, { status: 400 });
    }
    if (details.length < 10 || details.length > 5000) {
      return NextResponse.json({ error: "Your explanation must contain 10 to 5,000 characters." }, { status: 400 });
    }
    if (attachmentPath !== null && !/^applications\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(attachmentPath)) {
      return NextResponse.json({ error: "The supporting image reference is invalid." }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (!ip) {
      return NextResponse.json({ error: "We could not securely process this request. Please try again." }, { status: 503 });
    }

    const keyHash = createHmac("sha256", serviceKey).update(`application-submit:${ip}`).digest("hex");
    const db = adminClient();
    const { data: allowed, error: limitError } = await db.rpc("consume_upload_rate_limit", {
      p_key_hash: keyHash,
      p_limit: 3,
      p_window_seconds: 3600,
    });
    if (limitError) {
      console.error("Application rate limit unavailable:", limitError);
      return NextResponse.json({ error: "Application submission is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    if (allowed !== true) {
      return NextResponse.json(
        { error: "Too many applications were submitted from this connection. Please try again in about an hour." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const referenceNumber = "HB-" + randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const { error: insertError } = await db.from("applications").insert({
      reference_number: referenceNumber,
      full_name: fullName,
      email,
      phone: phone || null,
      location: location || null,
      assistance_type: assistanceType,
      requested_amount: requestedAmount || null,
      details,
      attachment_path: attachmentPath,
    });
    if (insertError) {
      console.error("Application database insert failed:", insertError);
      return NextResponse.json({ error: "We couldn't submit your application right now. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ reference_number: referenceNumber }, { status: 201 });
  } catch (error) {
    console.error("Application submission failed:", error);
    return NextResponse.json({ error: "Application submission is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
