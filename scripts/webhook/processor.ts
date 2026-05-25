/**
 * Simple webhook processor helper. Validates signature (if secret provided)
 * and returns a normalized payload to be enqueued/processed by job queue.
 */
import crypto from "crypto";

export function verifySignature(
  payload: Buffer | string,
  headerSig: string | undefined,
  secret?: string,
) {
  if (!secret) return true;
  if (!headerSig) return false;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(String(payload))
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(headerSig));
}

export function parseWebhookEvent(rawBody: Buffer | string) {
  try {
    if (Buffer.isBuffer(rawBody)) rawBody = rawBody.toString("utf8");
    return JSON.parse(String(rawBody));
  } catch (err) {
    return { raw: rawBody };
  }
}

export default { verifySignature, parseWebhookEvent };
