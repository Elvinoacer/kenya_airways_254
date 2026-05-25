import { NextResponse, NextRequest } from "next/server";
import { getSessionFromRequest } from "../../../../lib/api-session";
import { findPassengerDuplicates } from "../../../../lib/passengers";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = {
    ownerUserId:
      session.role === "STAFF" || session.role === "ADMIN"
        ? url.searchParams.get("ownerUserId") || undefined
        : session.userId,
    firstName: url.searchParams.get("firstName") || undefined,
    lastName: url.searchParams.get("lastName") || undefined,
    dateOfBirth: url.searchParams.get("dateOfBirth") || undefined,
    passportNo: url.searchParams.get("passportNo") || undefined,
    phone: url.searchParams.get("phone") || undefined,
    frequentFlyerNumber:
      url.searchParams.get("frequentFlyerNumber") || undefined,
  };
  const duplicates = findPassengerDuplicates(search);
  return NextResponse.json({ duplicates });
}
