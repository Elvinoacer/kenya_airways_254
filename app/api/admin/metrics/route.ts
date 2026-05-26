import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MetricsRumRow = Awaited<ReturnType<typeof prisma.metricsRum.findMany>>[number];

export async function GET() {
  const metrics = await prisma.metricsRum.findMany({
    orderBy: { receivedAt: "desc" },
    take: 1000,
  });

  const mapped = metrics.map((m: MetricsRumRow) => ({
    id: m.id,
    url: m.url,
    payload_json: m.payloadJson,
    received_at: m.receivedAt,
  }));

  return NextResponse.json({ metrics: mapped });
}
