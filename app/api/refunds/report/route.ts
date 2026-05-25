import { NextResponse } from "next/server";
import { getRefundReport } from "../../../../lib/refunds";

export async function GET() {
  return NextResponse.json(getRefundReport());
}
