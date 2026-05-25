import { NextResponse } from "next/server";
import scheduler from "@/lib/scheduledReports";

export async function GET(req: Request) {
  try {
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken) {
      const header =
        (req.headers as any).get?.("x-admin-token") ||
        (req.headers as any)["x-admin-token"];
      if (!header || header !== adminToken)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const items = (scheduler as any).listStoredReports();
    return NextResponse.json({ data: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
