import { query } from "./db";
import path from "path";

function makeId(prefix = "n-") {
  return (
    prefix +
    ((
      globalThis as unknown as { crypto?: { randomUUID?: () => string } }
    ).crypto?.randomUUID?.() ||
      String(Date.now()) + Math.random().toString(36).slice(2))
  );
}

export async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any,
) {
  const id = makeId("notif-");
  query.run(
    `INSERT INTO notifications (id, user_id, type, title, message, metadata_json, read, delivered_channels) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      userId,
      type,
      title,
      message,
      JSON.stringify(metadata || {}),
      "in-app",
    ],
  );
  return { id };
}

export function listInAppNotifications(userId: string, limit = 50) {
  return query.all(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit],
  );
}

export function markNotificationRead(id: string) {
  query.run(`UPDATE notifications SET read = 1 WHERE id = ?`, [id]);
  return true;
}

export function savePushSubscription(
  userId: string,
  endpoint: string,
  keys: any,
) {
  const id = makeId("ps-");
  query.run(
    `INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, keys_json) VALUES (?, ?, ?, ?)`,
    [id, userId, endpoint, JSON.stringify(keys || {})],
  );
  return { id };
}

async function sendWebPushToSubscription(sub: any, payload: any) {
  try {
    // load optional dependency via runtime require to avoid bundler resolution
    // eslint-disable-next-line no-eval
    const mod = eval("require")("web-push");
    const webpush = (mod && mod.default) || mod;
    const VAPID_SUBJECT =
      process.env.VAPID_SUBJECT || "mailto:admin@example.com";
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.warn("web-push VAPID keys not configured");
      return { ok: false, reason: "no_vapid" };
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    console.error("push send error", String(err));
    return { ok: false, error: String(err) };
  }
}

export async function sendEmail(to: string, subject: string, body: string) {
  try {
    // dynamic require to avoid bundler static resolution
    // eslint-disable-next-line no-eval
    const mod = eval("require")("nodemailer");
    const nodemailer = (mod && mod.default) || mod;
    if (!nodemailer) throw new Error("nodemailer not installed");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE || "false") === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@example.com",
      to,
      subject,
      text: body,
    });
    return { ok: true };
  } catch (err) {
    console.warn("sendEmail failed, falling back to console", String(err));
    console.log(`[email] to=${to} subject=${subject} body=${body}`);
    return { ok: false, error: String(err) };
  }
}

export async function sendSms(to: string, message: string) {
  try {
    // dynamic require Twilio if configured
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    ) {
      // eslint-disable-next-line no-eval
      const mod = eval("require")("twilio");
      const Twilio = (mod && mod.default) || mod;
      if (!Twilio) throw new Error("twilio not installed");
      const client = Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      await client.messages.create({
        body: message,
        to,
        from: process.env.TWILIO_FROM,
      });
      return { ok: true };
    }
    console.log(`[sms] to=${to} message=${message}`);
    return { ok: true };
  } catch (err) {
    console.warn("sendSms failed", String(err));
    return { ok: false, error: String(err) };
  }
}

export async function notifyPassengersForFlight(
  flightId: string,
  update: { status: string; reason?: string; note?: string; actor?: string },
) {
  const bookings: any[] = query.all(
    `SELECT id, booking_ref, contact_email, contact_phone, user_id FROM bookings_v2 WHERE flight_id = ? AND status NOT IN ('CANCELLED')`,
    [flightId],
  );
  let notified = 0;
  for (const b of bookings) {
    const auditId = makeId("ba-");
    query.run(
      `INSERT INTO booking_audit_v2 (id, booking_id, action, details_json, actor) VALUES (?, ?, ?, ?, ?)`,
      [
        auditId,
        b.id,
        "FLIGHT_STATUS_UPDATE",
        JSON.stringify({
          status: update.status,
          reason: update.reason,
          note: update.note,
          flightId,
        }),
        update.actor || "system",
      ],
    );
    // create in-app notification
    if (b.user_id)
      await createInAppNotification(
        b.user_id,
        "flight_update",
        `Flight update: ${update.status}`,
        `${update.note || update.reason || ""}`,
      );
    // send email and sms when available
    if (b.contact_email)
      await sendEmail(
        b.contact_email,
        `Flight update: ${update.status}`,
        `Your flight ${flightId} status: ${update.status}. ${update.note || ""}`,
      );
    if (b.contact_phone)
      await sendSms(
        b.contact_phone,
        `Flight ${flightId} update: ${update.status}. ${update.note || ""}`,
      );
    notified += 1;
  }
  return notified;
}

export function scheduleReminder(
  userId: string | null,
  bookingId: string | null,
  sendAtIso: string,
  type = "booking_reminder",
  params?: any,
) {
  const id = makeId("rem-");
  query.run(
    `INSERT INTO scheduled_reminders (id, user_id, booking_id, send_at, type, params_json, sent) VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      userId || null,
      bookingId || null,
      sendAtIso,
      type,
      JSON.stringify(params || {}),
    ],
  );
  return { id };
}

export async function processDueReminders() {
  const rows = query.all<any>(
    `SELECT * FROM scheduled_reminders WHERE sent = 0 AND datetime(send_at) <= datetime('now')`,
  );
  const results: any[] = [];
  for (const r of rows) {
    try {
      const params = r.params_json ? JSON.parse(r.params_json) : {};
      // Attempt delivery: for simplicity, prefer email -> sms -> in-app
      const user = r.user_id
        ? query.get<any>(`SELECT * FROM users WHERE id = ?`, [r.user_id])
        : null;
      if (user && user.email)
        await sendEmail(
          user.email,
          `Reminder: ${r.type}`,
          params.message || "Reminder from airline",
        );
      if (user && user.phone)
        await sendSms(user.phone, params.message || "Reminder from airline");
      if (r.user_id)
        await createInAppNotification(
          r.user_id,
          r.type,
          params.title || "Reminder",
          params.message || "Reminder",
        );
      query.run(
        `UPDATE scheduled_reminders SET sent = 1, sent_at = datetime('now') WHERE id = ?`,
        [r.id],
      );
      results.push({ id: r.id, ok: true });
    } catch (e: any) {
      console.error("processDueReminders error", e?.message || e);
      results.push({ id: r.id, ok: false, error: String(e) });
    }
  }
  return results;
}

export default {
  createInAppNotification,
  listInAppNotifications,
  markNotificationRead,
  savePushSubscription,
  sendWebPushToSubscription,
  sendEmail,
  sendSms,
  notifyPassengersForFlight,
  scheduleReminder,
  processDueReminders,
};
