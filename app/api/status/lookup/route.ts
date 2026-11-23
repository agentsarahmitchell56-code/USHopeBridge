import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function digest(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Status lookup is temporarily unavailable." }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const reference = typeof body?.reference === "string" ? body.reference.trim().toUpperCase() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (reference.length < 5 || reference.length > 40 || email.length < 5 || email.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid application reference and email address." }, { status: 400 });
    }

    // Vercel supplies x-real-ip. x-forwarded-for is a fallback for trusted
    // hosting proxies; do not accept a client-provided body/header IP value.
    const ip = request.headers.get("x-real-ip")?.trim()
      || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
      || "unknown";
    const hmacSecret = process.env.CRON_SECRET || serviceKey;
    const ipHash = digest(hmacSecret, `ip:${ip}`);
    const lookupHash = digest(hmacSecret, `lookup:${reference}\u0000${email}`);

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: allowed, error: limitError } = await db.rpc(
      "consume_application_status_rate_limit",
      { p_ip_hash: ipHash, p_lookup_hash: lookupHash },
    );
    if (limitError) {
      console.error("Application status rate limiter failed:", limitError.code || "unknown");
      return NextResponse.json({ error: "Status lookup is temporarily unavailable." }, { status: 503 });
    }
    if (allowed !== true) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 15 minutes before trying again." },
        { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } },
      );
    }

    const { data, error } = await db.rpc("lookup_application_status", {
      p_reference_number: reference,
      p_email: email,
    });
    if (error) {
      console.error("Application status lookup failed:", error.code || "unknown");
      return NextResponse.json({ error: "We couldn't check your application right now. Please try again shortly." }, { status: 503 });
    }

    const match = Array.isArray(data) ? data[0] ?? null : null;
    return NextResponse.json(
      { result: match },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Application status API failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Status lookup is temporarily unavailable." }, { status: 503 });
  }
}
