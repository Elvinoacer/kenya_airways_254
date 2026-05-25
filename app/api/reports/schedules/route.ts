import { NextResponse } from "next/server";
import scheduler from "../../../../lib/scheduledReports";

export async function GET() {
  try {
    const items = scheduler.listSchedules();
    return NextResponse.json({ data: items });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, reportType, params, intervalMinutes, nextRunAt, createdBy } =
      body;
    if (!name || !reportType) {
      return NextResponse.json(
        { error: "name and reportType required" },
        { status: 400 },
      );
    }
    const item = scheduler.createSchedule({
      name,
      reportType,
      params,
      intervalMinutes: Number(intervalMinutes || 1440),
      nextRunAt,
      createdBy,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, patch } = body;
    if (!id || !patch)
      return NextResponse.json(
        { error: "id and patch required" },
        { status: 400 },
      );
    const updated = scheduler.updateSchedule(id, patch);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
