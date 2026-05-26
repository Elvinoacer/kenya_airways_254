import { NextResponse, NextRequest } from "next/server";
import { getSessionFromRequest } from "../../../lib/api-session";
import {
  createPassengerProfile,
  listPassengerProfiles,
} from "../../../lib/passengers";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const ownerUserId = url.searchParams.get("ownerUserId") || undefined;
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";
  const includeBlacklisted =
    url.searchParams.get("includeBlacklisted") === "true";

  const list = await listPassengerProfiles({
    ownerUserId:
      session.role === "STAFF" || session.role === "ADMIN"
        ? ownerUserId
        : session.userId,
    includeDeleted,
    includeBlacklisted,
  } as any);
  return NextResponse.json({ passengers: list });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ownerUserId = body.ownerUserId || session.userId;
  if (
    session.role !== "STAFF" &&
    session.role !== "ADMIN" &&
    ownerUserId !== session.userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await createPassengerProfile(
    {
      ownerUserId,
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth,
      passportNo: body.passportNo,
      nationality: body.nationality,
      phone: body.phone,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      frequentFlyerNumber: body.frequentFlyerNumber,
      travelPreferences: body.travelPreferences,
      accessibilityNeeds: body.accessibilityNeeds,
      notes: body.notes,
      vipLabel: body.vipLabel,
      tags: body.tags,
    },
    session.userId,
  );

  if ((result as any).duplicate) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result, { status: 201 });
}
