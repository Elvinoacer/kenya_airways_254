import { NextResponse, NextRequest } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/api-session";
import {
  blacklistPassengerProfile,
  unblacklistPassengerProfile,
  getPassengerProfile,
} from "../../../../../lib/passengers";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "STAFF" && session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const profile = getPassengerProfile(id);
  if (!profile)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const action = String(body.action || "BLACKLIST").toUpperCase();
  const reason = body.reason || null;
  const result =
    action === "UNBLACKLIST"
      ? unblacklistPassengerProfile(id, session.userId)
      : blacklistPassengerProfile(
          id,
          reason || "manual blacklist",
          session.userId,
        );

  return NextResponse.json(result);
}
