import { NextResponse, NextRequest } from "next/server";
import {
  canAccessPassenger,
  getSessionFromRequest,
} from "../../../../lib/api-session";
import {
  deletePassengerProfile,
  getPassengerProfile,
  updatePassengerProfile,
} from "../../../../lib/passengers";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const profile = getPassengerProfile(id);
  if (!profile)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessPassenger(profile.ownerUserId, session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ passenger: profile });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const profile = getPassengerProfile(id);
  if (!profile)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessPassenger(profile.ownerUserId, session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const result = updatePassengerProfile(id, body, session.userId);
  if ((result as any).duplicate)
    return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const profile = getPassengerProfile(id);
  if (!profile)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessPassenger(profile.ownerUserId, session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = deletePassengerProfile(id, session.userId);
  return NextResponse.json(result);
}
