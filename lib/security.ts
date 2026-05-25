import { query } from "./db";
import crypto from "crypto";

export function escapeHtml(str: string) {
  if (!str) return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function validateString(input: any, maxLength = 2000) {
  if (typeof input !== "string") return false;
  if (input.length > maxLength) return false;
  // basic XSS prevention by rejecting script tags
  if (/\<\s*script/i.test(input)) return false;
  return true;
}

export function logAudit(
  actorId: string | null,
  actorRole: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: any,
) {
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  query.run(
    `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      actorId || null,
      actorRole || null,
      action,
      targetType || null,
      targetId || null,
      JSON.stringify(details || {}),
    ],
  );
  return { id };
}

export function logSecurityEvent(
  level: "info" | "warning" | "critical",
  message: string,
  details?: any,
) {
  // reuse audit_logs for security events; tag with action prefix
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  query.run(
    `INSERT INTO audit_logs (id, action, details_json) VALUES (?, ?, ?)`,
    [
      id,
      `security:${level}`,
      JSON.stringify({ message, details: details || {} }),
    ],
  );
  return { id };
}

const ENC_ALGO = "aes-256-gcm";
export function encryptData(plaintext: string, keyBase64?: string) {
  const key = keyBase64
    ? Buffer.from(keyBase64, "base64")
    : Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64");
  if (!key || key.length !== 32)
    throw new Error("encryption key must be 32 bytes base64");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptData(payloadBase64: string, keyBase64?: string) {
  const key = keyBase64
    ? Buffer.from(keyBase64, "base64")
    : Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64");
  if (!key || key.length !== 32)
    throw new Error("encryption key must be 32 bytes base64");
  const buf = Buffer.from(payloadBase64, "base64");
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const data = buf.slice(28);
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export default {
  escapeHtml,
  validateString,
  logAudit,
  logSecurityEvent,
  encryptData,
  decryptData,
};
