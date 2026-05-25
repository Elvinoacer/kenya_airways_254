import { NextResponse } from "next/server";
import reports from "../../../lib/reports";
// Import heavy binary libs dynamically inside the handler to avoid build-time type issues
// heavy binary libs imported dynamically inside handler

function bufferFromStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function GET(req: Request) {
  try {
    // Lightweight admin guard: require `x-admin-token` header to match ENV var ADMIN_API_TOKEN when set
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken) {
      const header =
        (req.headers as any).get?.("x-admin-token") ||
        (req.headers as any)["x-admin-token"];
      if (!header || header !== adminToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "booking";
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;
    const scheduleId = url.searchParams.get("scheduleId") || undefined;

    let rows: any = null;
    switch (type) {
      case "booking":
        rows = await reports.getBookingReport({ from, to });
        break;
      case "revenue":
        rows = await reports.getRevenueReport({ from, to });
        break;
      case "occupancy":
        rows = await reports.getOccupancyReport({ from, to });
        break;
      case "manifest":
        rows = await reports.getPassengerManifest({ scheduleId });
        break;
      case "flight_summary":
        rows = await reports.getFlightSummary({ scheduleId });
        break;
      case "cancellations":
        rows = await reports.getCancellationReport({ from, to });
        break;
      case "refunds":
        rows = await reports.getRefundReport({ from, to });
        break;
      case "assignments":
        rows = await reports.getAssignmentReport({ from, to });
        break;
      case "staff_performance":
        rows = await reports.getStaffPerformanceReport({
          employeeId: url.searchParams.get("employeeId") || undefined,
          from,
          to,
        });
        break;
      case "shift":
        rows = await reports.getShiftReport({ from, to });
        break;
      case "crew_utilization":
        rows = await reports.getCrewUtilizationReport({ from, to });
        break;
      case "payments":
        rows = await reports.getPaymentReport({ from, to });
        break;
      default:
        return NextResponse.json(
          { error: "unknown report type" },
          { status: 400 },
        );
    }

    // CSV export
    if (format === "csv") {
      const csv = Array.isArray(rows)
        ? reports.rowsToCsv(rows)
        : reports.rowsToCsv([rows]);
      const filename = `${type}-report-${Date.now()}.csv`;
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Excel export using exceljs
    if (format === "excel") {
      try {
        // Load optional dependency at runtime via require to avoid static bundler resolution
        // eslint-disable-next-line no-eval
        const mod = eval("require")("exceljs");
        const ExcelJS = (mod && mod.default) || mod;
        if (!ExcelJS) throw new Error("exceljs not available");
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Report");
        const dataRows = Array.isArray(rows) ? rows : [rows];
        if (dataRows.length > 0) {
          const headers = Object.keys(dataRows[0]);
          sheet.addRow(headers);
          for (const r of dataRows) {
            sheet.addRow(
              headers.map((h) =>
                r[h] === undefined || r[h] === null ? "" : r[h],
              ),
            );
          }
        }
        const buf = await workbook.xlsx.writeBuffer();
        const filename = `${type}-report-${Date.now()}.xlsx`;
        const body = new Uint8Array(buf as ArrayBufferLike);
        return new Response(body as any, {
          status: 200,
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch (e) {
        return NextResponse.json(
          { error: "exceljs not available on server" },
          { status: 501 },
        );
      }
    }

    // PDF export using pdfkit (simple tabular layout)
    if (format === "pdf") {
      try {
        // eslint-disable-next-line no-eval
        const mod = eval("require")("pdfkit");
        const PDF = (mod && mod.default) || mod;
        if (!PDF) throw new Error("pdfkit not available");
        const doc = new PDF({ autoFirstPage: true, size: "A4", margin: 40 });
        const stream = doc.pipe(require("stream").PassThrough());
        const dataRows = Array.isArray(rows) ? rows : [rows];

        doc.fontSize(14).text(`${type} report`, { align: "left" });
        doc.moveDown();

        if (dataRows.length === 0) {
          doc.fontSize(10).text("No records", { align: "left" });
          doc.end();
          const pdfBufEmpty = await bufferFromStream(stream as any);
          return new Response(pdfBufEmpty as any, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${type}-report-${Date.now()}.pdf"`,
            },
          });
        }

        const headers = Object.keys(dataRows[0]);
        // Simple table: render header row
        doc.fontSize(10).fillColor("black");
        const colWidths = headers.map(() =>
          Math.floor(
            (doc.page.width - doc.page.margins.left - doc.page.margins.right) /
              headers.length,
          ),
        );

        // Render header
        headers.forEach((h, i) => {
          doc
            .font("Helvetica-Bold")
            .text(
              String(h),
              doc.x +
                (i === 0
                  ? 0
                  : colWidths.slice(0, i).reduce((a, b) => a + b, 0)),
              doc.y,
              { width: colWidths[i], continued: i !== headers.length - 1 },
            );
        });
        doc.moveDown(0.5);

        // Render rows
        for (const row of dataRows) {
          headers.forEach((h, i) => {
            const v =
              row[h] === undefined || row[h] === null ? "" : String(row[h]);
            doc
              .font("Helvetica")
              .fontSize(9)
              .text(
                v,
                doc.x +
                  (i === 0
                    ? 0
                    : colWidths.slice(0, i).reduce((a, b) => a + b, 0)),
                doc.y,
                { width: colWidths[i], continued: i !== headers.length - 1 },
              );
          });
          doc.moveDown(0.2);
          // Add page break if needed
          if (doc.y > doc.page.height - doc.page.margins.bottom - 40)
            doc.addPage();
        }

        doc.end();
        const pdfBuf = await bufferFromStream(stream as any);
        const filename = `${type}-report-${Date.now()}.pdf`;
        return new Response(pdfBuf as any, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch (e) {
        return NextResponse.json(
          { error: "pdfkit not available on server" },
          { status: 501 },
        );
      }
    }

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
