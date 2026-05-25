import { NextResponse } from "next/server";
import { getPayment } from "../../../../lib/payments";

export async function GET(request: Request, context: any) {
  const id = context?.params?.id;
  const p = getPayment(id);
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ payment: p });
}
