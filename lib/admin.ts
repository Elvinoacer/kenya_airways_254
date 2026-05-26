import { prisma } from "./prisma";
import messaging from "./messaging";
import { sendEmail } from "./notifications";

type UserExportRow = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

function makeId(prefix = "a-") {
  return (
    prefix + ((globalThis as any).crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2))
  );
}

export async function listUsers(limit = 200) {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function setUserRole(id: string, role: string) {
  const normalizedRole = role.toUpperCase();
  if (!["PASSENGER", "STAFF", "ADMIN"].includes(normalizedRole)) {
    throw new Error("Invalid role");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: normalizedRole as any },
  });
  await prisma.auditLog.create({
    data: {
      action: "set_role",
      targetType: "user",
      targetId: id,
      detailsJson: JSON.stringify({ role: normalizedRole }),
    },
  });

  if (updated.email && normalizedRole !== "PASSENGER") {
    await sendEmail(
      updated.email,
      `Your Kenya Airways ${normalizedRole === "ADMIN" ? "admin" : "staff"} access is ready`,
      [
        `Hello ${updated.name || "there"},`,
        "",
        `Your account has been approved for ${normalizedRole.toLowerCase()} access by an administrator.`,
        "Sign in with your existing email and password to continue.",
        "",
        "If you were not expecting this access, contact the administrator immediately.",
      ].join("\n"),
      {
        eyebrow: normalizedRole === "ADMIN" ? "Admin access" : "Staff access",
        preheader: "Your Kenya Airways team access has been approved.",
        cta: {
          label: "Sign in to your account",
          url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/login`,
        },
      },
    );
  }

  return updated;
}

export async function getSetting(key: string) {
  return prisma.adminSetting.findUnique({ where: { keyName: key } });
}

export async function setSetting(key: string, value: string, description?: string) {
  const exists = await getSetting(key);
  if (exists) {
    await prisma.adminSetting.update({
      where: { keyName: key },
      data: { value, description: description || exists.description || null },
    });
  } else {
    await prisma.adminSetting.create({
      data: { keyName: key, value, description: description || null },
    });
  }
  await prisma.auditLog.create({
    data: {
      action: `set_setting:${key}`,
      detailsJson: JSON.stringify({ value }),
    },
  });
  return getSetting(key);
}

export async function listFeatureToggles() {
  return prisma.featureToggle.findMany({ orderBy: { name: "asc" } });
}

export async function setFeatureToggle(name: string, enabled: boolean, description?: string) {
  const t = await prisma.featureToggle.findUnique({ where: { name } });
  if (t) {
    await prisma.featureToggle.update({
      where: { name },
      data: { enabled, description: description || t.description || null },
    });
  } else {
    await prisma.featureToggle.create({
      data: { name, enabled, description: description || null },
    });
  }
  await prisma.auditLog.create({
    data: {
      action: `toggle_feature:${name}`,
      detailsJson: JSON.stringify({ enabled }),
    },
  });
  return prisma.featureToggle.findUnique({ where: { name } });
}

export async function listAuditLogs(limit = 200) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function exportUsersCsv() {
  const rows = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const header = ["id", "email", "name", "role", "created_at"].join(",") + "\n";
  const body = rows
    .map((r: UserExportRow) =>
      [r.id, r.email, r.name || "", r.role, r.createdAt.toISOString()]
        .map((c) => String(c).replace(/\n/g, " "))
        .join(","),
    )
    .join("\n");
  return header + body;
}

export async function enableMaintenanceMode(enabled: boolean) {
  await setSetting("maintenance_mode", enabled ? "1" : "0", "Toggle maintenance mode");
  await prisma.auditLog.create({
    data: {
      action: "maintenance_mode",
      detailsJson: JSON.stringify({ enabled }),
    },
  });
  return { ok: true };
}

export async function announceGlobal(subject: string | null, message: string, actor?: string) {
  const res = await messaging.broadcastAnnouncement({
    from: actor,
    message,
    subject: subject || "Announcement",
  });
  await prisma.auditLog.create({
    data: {
      action: "announce_global",
      detailsJson: JSON.stringify({ subject, message, actor }),
    },
  });
  return res;
}

export default {
  listUsers,
  getUser,
  setUserRole,
  getSetting,
  setSetting,
  listFeatureToggles,
  setFeatureToggle,
  listAuditLogs,
  exportUsersCsv,
  enableMaintenanceMode,
  announceGlobal,
};
