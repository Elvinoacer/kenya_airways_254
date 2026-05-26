import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.gate.findMany({
    orderBy: { gateCode: "asc" }
  });
  return NextResponse.json(rows);
}
