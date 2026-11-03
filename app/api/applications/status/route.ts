import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendHopebridgeEmail, sendHopebridgePush } from "../../../../lib/notification-delivery";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (!bearer) return NextResponse.json({ error: "Staff sign-in is required." }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Status updates are unavailable." }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await db.auth.getUser(bearer);
    if (authError || !auth.user) return NextResponse.json({ error: "Your staff session is invalid." }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (!profile || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Staff access is required." }, { status: 403 });

    const body = await request.json() as Record<string, unknown>;
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
    const status = typeof body.status === "string" ? body.status : "";
    if (!applicationId || !["NEW", "REVIEWING", "APPROVED", "DECLINED"].includes(status)) {
      return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
    }
    const { data: application, error: updateError } = await db.from("applications")
      .update({ status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", applicationId)
      .select("id,reference_number,full_name,email,assistance_type,status")
      .single();
    if (updateError || !application) {
      console.error("Application status update failed:", updateError);
      return NextResponse.json({ error: "Application status could not be updated." }, { status: 500 });
    }

    const label = status.charAt(0) + status.slice(1).toLowerCase();
    await sendHopebridgeEmail(
      `HOPEBRIDGE application status updated: ${application.reference_number || application.id}`,
      `An application status was updated.\n\nApplicant: ${application.full_name}\nReference: ${application.reference_number || "Not assigned"}\nNew status: ${label}\n\nOpen the staff dashboard: https://us-hope-bridge.vercel.app/admin`,
    );
    const { data: staff } = await db.from("profiles").select("id").in("role", ["admin", "agent"]);
    await Promise.all((staff || []).map((person) => sendHopebridgePush(
      { staffUserId: person.id },
      { title: "Application status updated", body: `${application.full_name}: ${label}`, url: "/admin#applications", tag: `status-${application.id}` },
    )));
    return NextResponse.json({ ok: true, application });
  } catch (error) {
    console.error("Status update request failed:", error);
    return NextResponse.json({ error: "Status update is temporarily unavailable." }, { status: 503 });
  }
}
