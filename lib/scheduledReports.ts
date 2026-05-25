import { query } from "./db";
import reports from "./reports";
import analytics from "./analytics";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// dynamic imports for optional heavy deps are ts-ignored in-place

const REPORTS_DIR = path.join(process.cwd(), "reports");
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

export function listSchedules() {
  return query.all<any>(
    `SELECT * FROM report_schedules ORDER BY created_at DESC`,
  );
}

export function getSchedule(id: string) {
  return query.get<any>(`SELECT * FROM report_schedules WHERE id = ?`, [id]);
}

export function createSchedule({
  name,
  reportType,
  params = {},
  intervalMinutes = 1440,
  nextRunAt,
  createdBy,
}: {
  name: string;
  reportType: string;
  params?: any;
  intervalMinutes?: number;
  nextRunAt?: string;
  createdBy?: string;
}) {
  const id = `rs-${uuidv4()}`;
  query.run(
    `INSERT INTO report_schedules (id, name, report_type, params_json, interval_minutes, next_run_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      reportType,
      JSON.stringify(params || {}),
      intervalMinutes,
      nextRunAt || null,
      createdBy || null,
    ],
  );
  return getSchedule(id);
}

export function updateSchedule(id: string, patch: any) {
  const existing = getSchedule(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...patch,
    params_json: patch.params
      ? JSON.stringify(patch.params)
      : existing.params_json,
    updated_at: new Date().toISOString(),
  };
  query.run(
    `UPDATE report_schedules SET name = ?, report_type = ?, params_json = ?, interval_minutes = ?, next_run_at = ?, active = ?, updated_at = ? WHERE id = ?`,
    [
      updated.name,
      updated.report_type,
      updated.params_json,
      updated.interval_minutes,
      updated.next_run_at,
      updated.active ? 1 : 0,
      updated.updated_at,
      id,
    ],
  );
  return getSchedule(id);
}

export function deleteSchedule(id: string) {
  query.run(`DELETE FROM report_schedules WHERE id = ?`, [id]);
  return true;
}

async function generateAndStore({
  scheduleId,
  reportType,
  params,
  format = "csv",
}: {
  scheduleId?: string;
  reportType: string;
  params?: any;
  format?: "csv" | "excel" | "pdf";
}) {
  // dispatch to reports library
  let rows: any = null;
  switch (reportType) {
    case "booking":
      rows = await reports.getBookingReport(params || {});
      break;
    case "revenue":
      rows = await reports.getRevenueReport(params || {});
      break;
    case "occupancy":
      rows = await reports.getOccupancyReport(params || {});
      break;
    case "manifest":
      rows = await reports.getPassengerManifest(params || {});
      break;
    case "flight_summary":
      rows = await reports.getFlightSummary(params || {});
      break;
    case "cancellations":
      rows = await reports.getCancellationReport(params || {});
      break;
    case "refunds":
      rows = await reports.getRefundReport(params || {});
      break;
    case "payments":
      rows = await reports.getPaymentReport(params || {});
      break;
    default:
      throw new Error("unknown report type");
  }
  // if not filled by reports switch, try analytics handlers with reportType prefix 'analytics:'
  if (rows === null) {
    if (typeof reportType === "string" && reportType.startsWith("analytics:")) {
      const metric = reportType.split(":")[1];
      switch (metric) {
        case "revenue":
          rows = await analytics.revenueAnalytics(params || {});
          break;
        case "occupancy":
          rows = await analytics.flightOccupancyAnalytics(params || {});
          break;
        case "peak_routes":
          rows = await analytics.peakRouteAnalytics(params || {});
          break;
        case "passenger_trends":
          rows = await analytics.passengerTrends(params || {});
          break;
        case "booking_trends":
          rows = await analytics.bookingTrends(params || {});
          break;
        case "cancellations":
          rows = await analytics.cancellationAnalytics(params || {});
          break;
        case "kpis":
          rows = await analytics.kpiTracking(params || {});
          break;
        case "forecast_revenue":
          rows = await analytics.forecastingRevenue(params || {});
          break;
        default:
          throw new Error("unknown report type");
      }
    } else {
      throw new Error("unknown report type");
    }
  }

  const ts = Date.now();
  const filenameBase = `${reportType}-${scheduleId || "manual"}-${ts}`;
  const fileName =
    format === "excel"
      ? `${filenameBase}.xlsx`
      : format === "pdf"
        ? `${filenameBase}.pdf`
        : `${filenameBase}.csv`;
  const filePath = path.join(REPORTS_DIR, fileName);

  if (format === "csv") {
    const csv = Array.isArray(rows)
      ? reports.rowsToCsv(rows)
      : reports.rowsToCsv([rows]);
    fs.writeFileSync(filePath, csv, "utf8");
  } else if (format === "excel") {
    // Use the reports API logic for Excel generation via exceljs dynamic import
    // Keep simple: produce a CSV but with .xlsx extension if exceljs missing
    try {
      // load via require at runtime to avoid bundler static resolution
      // eslint-disable-next-line no-eval
      const mod = eval("require")("exceljs");
      const ExcelJS = (mod && mod.default) || mod;
      if (!ExcelJS) throw new Error("exceljs not installed");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Report");
      const dataRows = Array.isArray(rows) ? rows : [rows];
      if (dataRows.length > 0) {
        const headers = Object.keys(dataRows[0]);
        sheet.addRow(headers);
        for (const r of dataRows)
          sheet.addRow(
            headers.map((h) =>
              r[h] === undefined || r[h] === null ? "" : r[h],
            ),
          );
      }
      const buf = await workbook.xlsx.writeBuffer();
      fs.writeFileSync(filePath, Buffer.from(buf));
    } catch (e) {
      // fallback to CSV
      const csv = Array.isArray(rows)
        ? reports.rowsToCsv(rows)
        : reports.rowsToCsv([rows]);
      fs.writeFileSync(filePath, csv, "utf8");
    }
  } else if (format === "pdf") {
    try {
      // eslint-disable-next-line no-eval
      const mod = eval("require")("pdfkit");
      const PDF = (mod && mod.default) || mod;
      if (!PDF) throw new Error("pdfkit not installed");
      const doc = new PDF({ autoFirstPage: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.fontSize(14).text(`${reportType} report`);
      doc.moveDown();
      const dataRows = Array.isArray(rows) ? rows : [rows];
      if (dataRows.length === 0) {
        doc.text("No records\n");
      } else {
        const headers = Object.keys(dataRows[0]);
        doc.fontSize(10).text(headers.join(" | "));
        doc.moveDown(0.2);
        for (const r of dataRows)
          doc.text(
            headers
              .map((h) =>
                r[h] === undefined || r[h] === null ? "" : String(r[h]),
              )
              .join(" | "),
          );
      }
      doc.end();
      // wait for stream finish
      await new Promise((res) => stream.on("finish", () => res(undefined)));
    } catch (e) {
      const csv = Array.isArray(rows)
        ? reports.rowsToCsv(rows)
        : reports.rowsToCsv([rows]);
      fs.writeFileSync(filePath, csv, "utf8");
    }
  }

  // record stored report
  const id = `sr-${uuidv4()}`;
  query.run(
    `INSERT INTO stored_reports (id, schedule_id, report_type, params_json, file_path, file_format, generated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      scheduleId || null,
      reportType,
      JSON.stringify(params || {}),
      filePath,
      format,
    ],
  );
  return { id, scheduleId, reportType, params, filePath, format };
}

export async function runDueSchedules() {
  const now = new Date();
  const rows = query.all<any>(
    `SELECT * FROM report_schedules WHERE active = 1 AND (next_run_at IS NULL OR datetime(next_run_at) <= datetime('now'))`,
  );
  const results: any[] = [];
  for (const s of rows) {
    try {
      const params = s.params_json ? JSON.parse(s.params_json) : {};
      const format = params.format || "csv";
      const res = await generateAndStore({
        scheduleId: s.id,
        reportType: s.report_type,
        params,
        format,
      });
      results.push({ schedule: s.id, ok: true, result: res });
      // update next_run_at and last_run_at
      const next = new Date(
        Date.now() + Number(s.interval_minutes || 1440) * 60 * 1000,
      );
      query.run(
        `UPDATE report_schedules SET last_run_at = datetime('now'), next_run_at = ?, updated_at = datetime('now') WHERE id = ?`,
        [next.toISOString(), s.id],
      );
    } catch (e: any) {
      results.push({ schedule: s.id, ok: false, error: String(e) });
      query.run(
        `UPDATE report_schedules SET last_run_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        [s.id],
      );
    }
  }
  return results;
}

export function listStoredReports() {
  return query.all<any>(
    `SELECT * FROM stored_reports ORDER BY generated_at DESC`,
  );
}

export function getStoredReport(id: string) {
  return query.get<any>(`SELECT * FROM stored_reports WHERE id = ?`, [id]);
}

export function deleteStoredReport(id: string) {
  const r = getStoredReport(id);
  if (!r) return false;
  try {
    if (r.file_path && fs.existsSync(r.file_path)) fs.unlinkSync(r.file_path);
  } catch (e) {
    // ignore
  }
  query.run(`DELETE FROM stored_reports WHERE id = ?`, [id]);
  return true;
}

const scheduledReports = {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runDueSchedules,
  generateAndStore,
  listStoredReports,
  getStoredReport,
  deleteStoredReport,
};

export default scheduledReports;
