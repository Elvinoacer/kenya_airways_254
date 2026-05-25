import { verifySessionCookie, type SessionPayload } from "./auth-session";

export async function getSessionFromRequest(
  req: Request,
): Promise<SessionPayload | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("kq_session="));
  const cookieValue = cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
  return verifySessionCookie(cookieValue ?? undefined);
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
