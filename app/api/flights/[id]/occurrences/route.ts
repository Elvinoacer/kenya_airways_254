import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(request: Request, context: any) {
  const id = context?.params?.id;
  const row = await prisma.flight.findUnique({
    where: { id },
    include: { meta: true }
  });
  
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  
  const metaData = row.meta?.data as any || {};
  const rule: string | null = metaData.recurrence_rule || null;
  if (!rule) return NextResponse.json({ occurrences: [] });

  // Very small recurrence support: 'daily' or 'weekly:Mon,Tue'
  const occurrences: any[] = [];
  const start = new Date(row.departureTime || Date.now());
  const until = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days window

  if (rule === "daily") {
    let cur = new Date(start);
    while (cur <= until && occurrences.length < 100) {
      occurrences.push({ departure_time: cur.toISOString() });
      cur = addDays(cur, 1);
    }
  } else if (rule.startsWith("weekly:")) {
    const parts = rule.split(":");
    const days = (parts[1] || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    let cur = new Date(start);
    while (cur <= until && occurrences.length < 200) {
      if (
        days.includes(
          ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][cur.getDay()],
        )
      ) {
        occurrences.push({ departure_time: cur.toISOString() });
      }
      cur = addDays(cur, 1);
    }
  }

  return NextResponse.json({ occurrences });
}
