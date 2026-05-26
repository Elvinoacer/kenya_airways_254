import { NextResponse, NextRequest } from "next/server";
import {
  canAccessPassenger,
  getSessionFromRequest,
} from "../../../../../lib/api-session";
import {
  getPassengerProfile,
  setPassengerTags,
} from "../../../../../lib/passengers";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const profile = await getPassengerProfile(id);
  if (!profile)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessPassenger(profile.ownerUserId || "", session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const result = await setPassengerTags(
    id,
    Array.isArray(body.tags) ? body.tags : [],
    body.vipLabel ?? null
  );
  return NextResponse.json(result);
}
