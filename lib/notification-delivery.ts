import "server-only";
import nodemailer from "nodemailer";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase server configuration is missing.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sendHopebridgeEmail(subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, HOPEBRIDGE_NOTIFICATION_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !HOPEBRIDGE_NOTIFICATION_EMAIL) {
    console.warn("HOPEBRIDGE email notifications are not configured.");
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: { name: "HOPEBRIDGE Notifications", address: SMTP_USER },
      to: HOPEBRIDGE_NOTIFICATION_EMAIL,
      subject,
      text,
    });
  } catch (error) {
    console.error("HOPEBRIDGE email notification failed:", error);
  }
}

export async function sendHopebridgePush(
  filter: { staffUserId?: string; conversationId?: string },
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_SUBJECT || "mailto:hopebridge098@gmail.com";
  if (!publicKey || !privateKey || (!filter.staffUserId && !filter.conversationId)) return;

  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
    const db = adminClient();
    let query = db.from("push_subscriptions").select("id,endpoint,p256dh,auth");
    query = filter.staffUserId
      ? query.eq("staff_user_id", filter.staffUserId)
      : query.eq("conversation_id", filter.conversationId!);
    const { data, error } = await query;
    if (error) throw error;

    await Promise.all((data || []).map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify(payload));
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("id", subscription.id);
        } else {
          console.error("HOPEBRIDGE push delivery failed:", statusCode || error);
        }
      }
    }));
  } catch (error) {
    console.error("HOPEBRIDGE push notification error:", error);
  }
}
