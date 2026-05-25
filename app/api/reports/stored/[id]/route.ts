import { NextResponse } from "next/server";
import scheduler from "@/lib/scheduledReports";
import fs from "fs";
import path from "path";

export async function GET(req: Request, ctx: any) {
  try {
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken) {
      const header =
        (req.headers as any).get?.("x-admin-token") ||
        (req.headers as any)["x-admin-token"];
      if (!header || header !== adminToken)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const id =
      (ctx && ctx.params && ctx.params.id) ||
      new URL(req.url).pathname.split("/").filter(Boolean).pop();
    const item = (scheduler as any).getStoredReport(id);
    if (!item)
      return NextResponse.json({ error: "not found" }, { status: 404 });
    const filePath = item.file_path || item.filePath;
    if (!filePath || !fs.existsSync(filePath))
      return NextResponse.json({ error: "file not found" }, { status: 404 });
    const buf = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const contentType =
      item.file_format === "pdf"
        ? "application/pdf"
        : item.file_format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8";
    return new Response(buf as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, ctx: any) {
  try {
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken) {
      const header =
        (req.headers as any).get?.("x-admin-token") ||
        (req.headers as any)["x-admin-token"];
      if (!header || header !== adminToken)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const id =
      (ctx && ctx.params && ctx.params.id) ||
      new URL(req.url).pathname.split("/").filter(Boolean).pop();
    const ok = (scheduler as any).deleteStoredReport(id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
