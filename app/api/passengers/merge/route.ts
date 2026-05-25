import { NextResponse, NextRequest } from "next/server";
import { getSessionFromRequest } from "../../../../lib/api-session";
import {
  getPassengerProfile,
  mergePassengerProfiles,
} from "../../../../lib/passengers";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "STAFF" && session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { sourcePassengerId, targetPassengerId, reason } = body || {};
  const source = getPassengerProfile(sourcePassengerId);
  const target = getPassengerProfile(targetPassengerId);
  if (!source || !target)
    return NextResponse.json(
      { error: "Source or target not found" },
      { status: 404 },
    );

  const result = mergePassengerProfiles({
    sourcePassengerId,
    targetPassengerId,
    reason,
    actor: session.userId,
  });
  return NextResponse.json(result);
}
