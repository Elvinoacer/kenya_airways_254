import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.aircraft.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(rows);
}
