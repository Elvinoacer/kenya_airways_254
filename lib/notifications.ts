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

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  keys: any,
) {
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
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    ) {
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
    if (b.contactPhone) {
      await sendSms(
        b.contactPhone,
        `Flight ${flightId} update: ${update.status}. ${update.note || ""}`,
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
        await sendEmail(
          user.email,
          `Reminder: ${r.type}`,
          params.message || "Reminder from airline",
        );
      }
      if (user?.phone) {
        await sendSms(user.phone, params.message || "Reminder from airline");
      }
      if (r.userId) {
        await createInAppNotification(
          r.userId,
          r.type,
          params.title || "Reminder",
          params.message || "Reminder",
        );
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
  sendSms,
  notifyPassengersForFlight,
  scheduleReminder,
  processDueReminders,
};
