// Secret key for HMAC signing (shared between middleware and actions)
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "kenya-airways-super-secret-key-32-chars-long-or-more";

export interface SessionPayload {
  sessionId: string;
  userId: string;
  role: string;
  onboardingCompleted: boolean;
  expiresAt: number; // timestamp
}

// Web Crypto HMAC SHA-256 for cross-runtime compatibility (Edge & Node)
export async function signData(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SESSION_SECRET);
  const messageData = encoder.encode(message);

  const cryptoKey = await globalThis.crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);

  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, messageData);

  // Return base64url format signature
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function verifyData(message: string, signature: string): Promise<boolean> {
  const expected = await signData(message);
  return expected === signature;
}

// Parse cookie value into payload
export async function verifySessionCookie(cookieValue: string | undefined): Promise<SessionPayload | null> {
  if (!cookieValue) return null;

  try {
    const parts = cookieValue.split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const isValid = await verifyData(payloadBase64, signature);
    if (!isValid) return null;

    const payloadStr = atob(payloadBase64);
    const payload = JSON.parse(payloadStr) as Partial<SessionPayload>;

    if (
      typeof payload.sessionId !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.onboardingCompleted !== "boolean" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null; // Expired
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// Generate signed session cookie value
export async function generateSessionCookie(payload: SessionPayload): Promise<string> {
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = btoa(payloadStr);
  const signature = await signData(payloadBase64);
  return `${payloadBase64}.${signature}`;
}
