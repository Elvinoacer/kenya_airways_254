import { query } from "./db";
import messaging from "./messaging";

function makeId(prefix = "a-") {
  return (
    prefix +
    ((globalThis as any).crypto?.randomUUID?.() ||
      String(Date.now()) + Math.random().toString(36).slice(2))
  );
}

export function listUsers(limit = 200) {
  return query.all(
    `SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export function getUser(id: string) {
  return query.get(`SELECT * FROM users WHERE id = ?`, [id]);
}

export function setUserRole(id: string, role: string) {
  query.run(
    `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [role, id],
  );
  const entryId = makeId("audit-");
  query.run(
    `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entryId, null, null, `set_role`, "user", id, JSON.stringify({ role })],
  );
  return getUser(id);
}

export function getSetting(key: string) {
  return query.get(`SELECT * FROM admin_settings WHERE key_name = ?`, [key]);
}

export function setSetting(key: string, value: string, description?: string) {
  const exists: any = getSetting(key);
  if (exists) {
    query.run(
      `UPDATE admin_settings SET value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?`,
      [value, description || exists.description || null, key],
    );
  } else {
    const id = makeId("sett-");
    query.run(
      `INSERT INTO admin_settings (id, key_name, value, description) VALUES (?, ?, ?, ?)`,
      [id, key, value, description || null],
    );
  }
  const entryId = makeId("audit-");
  query.run(
    `INSERT INTO audit_logs (id, actor_id, actor_role, action, details_json) VALUES (?, ?, ?, ?, ?)`,
    [entryId, null, null, `set_setting:${key}`, JSON.stringify({ value })],
  );
  return getSetting(key);
}

export function listFeatureToggles() {
  return query.all(`SELECT * FROM feature_toggles ORDER BY name`);
}

export function setFeatureToggle(
  name: string,
  enabled: boolean,
  description?: string,
) {
  const t: any = query.get(`SELECT * FROM feature_toggles WHERE name = ?`, [
    name,
  ]);
  if (t) {
    query.run(
      `UPDATE feature_toggles SET enabled = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?`,
      [enabled ? 1 : 0, description || t.description || null, name],
    );
  } else {
    const id = makeId("ft-");
    query.run(
      `INSERT INTO feature_toggles (id, name, enabled, description) VALUES (?, ?, ?, ?)`,
      [id, name, enabled ? 1 : 0, description || null],
    );
  }
  const entryId = makeId("audit-");
  query.run(
    `INSERT INTO audit_logs (id, action, details_json) VALUES (?, ?, ?)`,
    [entryId, `toggle_feature:${name}`, JSON.stringify({ enabled })],
  );
  return query.get(`SELECT * FROM feature_toggles WHERE name = ?`, [name]);
}

export function listAuditLogs(limit = 200) {
  return query.all(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export function exportUsersCsv() {
  const rows = query.all<any>(
    `SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`,
  );
  const header = ["id", "email", "name", "role", "created_at"].join(",") + "\n";
  const body = rows
    .map((r) =>
      [r.id, r.email, r.name || "", r.role, r.created_at]
        .map((c) => String(c).replace(/\n/g, " "))
        .join(","),
    )
    .join("\n");
  return header + body;
}

export function enableMaintenanceMode(enabled: boolean) {
  setSetting(
    "maintenance_mode",
    enabled ? "1" : "0",
    "Toggle maintenance mode",
  );
  const entryId = makeId("audit-");
  query.run(
    `INSERT INTO audit_logs (id, action, details_json) VALUES (?, ?, ?)`,
    [entryId, `maintenance_mode`, JSON.stringify({ enabled })],
  );
  return { ok: true };
}

export function announceGlobal(
  subject: string | null,
  message: string,
  actor?: string,
) {
  // Use messaging broadcast for global announcements
  const res = messaging.broadcastAnnouncement({
    from: actor,
    message,
    subject: subject || "Announcement",
  });
  const id = makeId("audit-");
  query.run(
    `INSERT INTO audit_logs (id, action, details_json) VALUES (?, ?, ?)`,
    [id, `announce_global`, JSON.stringify({ subject, message, actor })],
  );
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
