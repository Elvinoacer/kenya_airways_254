import { prisma } from "./prisma";

export async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any,
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadataJson: JSON.stringify(metadata || {}),
      deliveredChannels: "in-app",
      read: false,
    },
  });
  return { id: notification.id };
}

export async function listInAppNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return true;
}

export async function savePushSubscription(userId: string, endpoint: string, keys: any) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { userId_endpoint: { userId, endpoint } },
  });
  if (existing) {
    const updated = await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: { keysJson: JSON.stringify(keys || {}) },
    });
    return { id: updated.id };
  } else {
    const created = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        keysJson: JSON.stringify(keys || {}),
      },
    });
    return { id: created.id };
  }
}

export async function sendWebPushToSubscription(sub: any, payload: any) {
  try {
    const mod = eval("require")("web-push");
    const webpush = (mod && mod.default) || mod;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
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

type EmailOptions = {
  html?: string;
  preheader?: string;
  eyebrow?: string;
  cta?: {
    label: string;
    url: string;
  };
  code?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br />");
      return `<p style="margin:0 0 16px;color:#4b3330;font-size:15px;line-height:1.65;">${escaped}</p>`;
    })
    .join("");
}

export function buildPremiumEmailHtml(subject: string, body: string, options: EmailOptions = {}) {
  const preheader = options.preheader || "An update from Kenya Airways.";
  const eyebrow = options.eyebrow || "Kenya Airways";
  const cta = options.cta
    ? `<tr>
        <td style="padding:10px 32px 26px;">
          <a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background:#bb0013;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:.01em;padding:14px 22px;border-radius:10px;box-shadow:0 12px 24px rgba(187,0,19,.22);">${escapeHtml(options.cta.label)}</a>
        </td>
      </tr>`
    : "";
  const code = options.code
    ? `<tr>
        <td style="padding:4px 32px 24px;">
          <div style="display:inline-block;background:#fcf9f8;border:1px solid #e5e2e1;border-radius:14px;padding:16px 22px;color:#410001;font-size:30px;line-height:1;font-weight:900;letter-spacing:8px;">${escapeHtml(options.code)}</div>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f3f2;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3f2;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8d8d5;box-shadow:0 20px 48px rgba(65,0,1,.12);">
            <tr>
              <td style="background:#410001;padding:28px 32px;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-weight:900;font-size:20px;letter-spacing:.08em;text-transform:uppercase;">Kenya <span style="color:#ffb4aa;">Airways</span></div>
                      <div style="margin-top:8px;color:#ffddd8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;">${escapeHtml(eyebrow)}</div>
                    </td>
                    <td align="right" style="color:#ffb4aa;font-size:13px;font-weight:700;">The Pride of Africa</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 12px;">
                <h1 style="margin:0;color:#1A1A1A;font-size:30px;line-height:1.18;letter-spacing:0;font-weight:900;">${escapeHtml(subject)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 4px;">
                ${textToParagraphs(body)}
              </td>
            </tr>
            ${code}
            ${cta}
            <tr>
              <td style="padding:0 32px 32px;">
                <div style="border-top:1px solid #eee5e3;padding-top:18px;color:#7a5b57;font-size:12px;line-height:1.6;">
                  This message was sent by Kenya Airways. For your security, never share passwords or verification codes with anyone.
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#1A1A1A;padding:18px 32px;color:#ffffff99;font-size:12px;line-height:1.6;">
                Kenya Airways &bull; Connecting Africa to the world
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail(to: string, subject: string, body: string, options: EmailOptions = {}) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || "Kenya Airways <no-reply@kenyaairways.com>";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [to],
        subject,
        text: body,
        html: options.html || buildPremiumEmailHtml(subject, body, options),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Resend API error: ${response.status} ${errorText}`);
    }

    return { ok: true };
  } catch (err) {
    console.warn("sendEmail failed", String(err));
    return { ok: false, error: String(err) };
  }
}

export async function notifyPassengersForFlight(
  flightId: string,
  update: { status: string; reason?: string; note?: string; actor?: string },
) {
  const bookings = await prisma.booking.findMany({
    where: { flightId, status: { not: "CANCELLED" } },
  });
  let notified = 0;
  for (const b of bookings) {
    await prisma.auditLog.create({
      data: {
        action: "FLIGHT_STATUS_UPDATE",
        targetType: "booking",
        targetId: b.id,
        detailsJson: JSON.stringify({
          status: update.status,
          reason: update.reason,
          note: update.note,
          flightId,
        }),
        actorId: update.actor || "system",
      },
    });
    if (b.userId) {
      await createInAppNotification(
        b.userId,
        "flight_update",
        `Flight update: ${update.status}`,
        `${update.note || update.reason || ""}`,
      );
    }
    if (b.contactEmail) {
      await sendEmail(
        b.contactEmail,
        `Flight update: ${update.status}`,
        `Your flight ${flightId} status: ${update.status}. ${update.note || ""}`,
      );
    }
    notified += 1;
  }
  return notified;
}

export async function scheduleReminder(
  userId: string | null,
  bookingId: string | null,
  sendAtIso: string,
  type = "booking_reminder",
  params?: any,
) {
  const reminder = await prisma.scheduledReminder.create({
    data: {
      userId,
      bookingId,
      sendAt: new Date(sendAtIso),
      type,
      paramsJson: JSON.stringify(params || {}),
      sent: false,
    },
  });
  return { id: reminder.id };
}

export async function processDueReminders() {
  const reminders = await prisma.scheduledReminder.findMany({
    where: { sent: false, sendAt: { lte: new Date() } },
  });
  const results: any[] = [];
  for (const r of reminders) {
    try {
      const params = r.paramsJson ? JSON.parse(r.paramsJson) : {};
      const user = r.userId ? await prisma.user.findUnique({ where: { id: r.userId } }) : null;
      if (user?.email) {
        await sendEmail(user.email, `Reminder: ${r.type}`, params.message || "Reminder from airline");
      }
      if (r.userId) {
        await createInAppNotification(r.userId, r.type, params.title || "Reminder", params.message || "Reminder");
      }
      await prisma.scheduledReminder.update({
        where: { id: r.id },
        data: { sent: true, sentAt: new Date() },
      });
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
  notifyPassengersForFlight,
  scheduleReminder,
  processDueReminders,
};
