import { NextResponse } from "next/server";
import scheduler from "../../../../lib/scheduledReports";

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

    const url = new URL(req.url);
    const metric = (url.searchParams.get("metric") || "revenue").toLowerCase();
    const format = (
      url.searchParams.get("format") || "csv"
    ).toLowerCase() as any;
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;

    const params: any = { from, to };
    const reportType = `analytics:${metric}`;
    const res = await scheduler.generateAndStore({
      scheduleId: undefined,
      reportType,
      params,
      format,
    });
    return NextResponse.json({ ok: true, stored: res });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
