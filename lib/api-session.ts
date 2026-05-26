import {
  isSessionActiveInDb,
  verifySessionCookie,
  type SessionPayload,
} from "./auth-session";

export async function getSessionFromRequest(
  req: Request,
): Promise<SessionPayload | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("kq_session="));
  const cookieValue = cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
  const payload = await verifySessionCookie(cookieValue ?? undefined);
  if (!payload) return null;
  const active = await isSessionActiveInDb(payload.sessionId);
  return active ? payload : null;
}

export function canAccessPassenger(
  ownerUserId: string,
  session: SessionPayload | null,
) {
  if (!session) return false;
  return (
    session.role === "STAFF" ||
    session.role === "ADMIN" ||
    session.userId === ownerUserId
  );
}
