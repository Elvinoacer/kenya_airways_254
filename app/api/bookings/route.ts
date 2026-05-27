import { NextResponse } from "next/server";
import { createHold } from "../../../lib/bookings";
import { getSessionFromRequest } from "../../../lib/api-session";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  try {
    const res = await createHold({ ...body, userId: session.userId });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
