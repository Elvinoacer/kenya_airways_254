import { NextResponse } from "next/server";
import {
  approveRefund,
  getRefund,
  processRefund,
  rejectRefund,
} from "../../../../lib/refunds";

export async function GET(_request: Request, context: any) {
  const refund = getRefund(context?.params?.id);
  if (!refund)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ refund });
}

export async function PATCH(request: Request, context: any) {
  const body: any = await request.json().catch(() => ({}));
  const refundId = context?.params?.id;
  try {
    const action = String(body.action || "APPROVE").toUpperCase();
    if (action === "REJECT") {
      return NextResponse.json({
        refund: rejectRefund(refundId, body.actor, body.reason),
      });
    }
    if (action === "PROCESS") {
      return NextResponse.json({ refund: processRefund(refundId, body.actor) });
    }
    return NextResponse.json({ refund: approveRefund(refundId, body.actor) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
