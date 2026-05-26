import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url || "";
    const payload = JSON.stringify(body.entries || body);
    
    await prisma.metricsRum.create({
      data: { url, payloadJson: payload }
    });
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
