import { prisma } from "./prisma";
import fs from "fs";
import path from "path";
import reports from "./reports";

const REPORTS_DIR = path.join(process.cwd(), "public", "reports");

export async function createSchedule(
  name: string,
  reportType: string,
  intervalMinutes: number,
  params?: any,
  createdBy?: string,
) {
  const schedule = await prisma.reportSchedule.create({
    data: {
      name,
      reportType,
      intervalMinutes,
      paramsJson: JSON.stringify(params || {}),
      createdBy: createdBy || null,
      nextRunAt: new Date(Date.now() + intervalMinutes * 60000),
    },
  });
  return { id: schedule.id };
}

export async function listSchedules() {
  return prisma.reportSchedule.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function processScheduledReports() {
  const due = await prisma.reportSchedule.findMany({
    where: {
      active: true,
      nextRunAt: { lte: new Date() },
    },
  });
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const results = [];
  for (const schedule of due) {
    try {
      const params = schedule.paramsJson ? JSON.parse(schedule.paramsJson) : {};
      params.format = "csv";
      
      let data = "";
      if (schedule.reportType === "booking") {
        data = (await reports.generateBookingReport(params)) as string;
      } else if (schedule.reportType === "revenue") {
        data = (await reports.generateRevenueReport(params)) as string;
      } else if (schedule.reportType === "flight_performance") {
        data = (await reports.generateFlightPerformanceReport(params)) as string;
      } else {
        throw new Error(`Unknown report type: ${schedule.reportType}`);
      }
      
      const fileName = `${schedule.reportType}_${schedule.id}_${Date.now()}.csv`;
      const filePath = path.join(REPORTS_DIR, fileName);
      fs.writeFileSync(filePath, data);
      
      const stored = await prisma.storedReport.create({
        data: {
          scheduleId: schedule.id,
          reportType: schedule.reportType,
          paramsJson: schedule.paramsJson,
          filePath: `/reports/${fileName}`,
          fileFormat: "csv",
        },
      });
      
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + schedule.intervalMinutes * 60000),
        },
      });
      
      results.push({ id: schedule.id, ok: true, storedId: stored.id });
    } catch (e: any) {
      console.error(`Failed to process schedule ${schedule.id}: ${e.message}`);
      results.push({ id: schedule.id, ok: false, error: e.message });
    }
  }
  return results;
}

export async function listStoredReports(limit = 100) {
  return prisma.storedReport.findMany({
    orderBy: { generatedAt: "desc" },
    take: limit,
  });
}

export async function generateAndStore({ scheduleId, reportType, params, format = "csv" }: { scheduleId?: string, reportType: string, params: any, format?: string }) {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  let data = "";
  if (reportType === "booking") {
    data = (await reports.generateBookingReport(params)) as string;
  } else if (reportType === "revenue" || reportType === "analytics:revenue") {
    data = (await reports.generateRevenueReport(params)) as string;
  } else if (reportType === "flight_performance") {
    data = (await reports.generateFlightPerformanceReport(params)) as string;
  } else {
    // fallback
    data = (await reports.generateRevenueReport(params)) as string;
  }
  
  const fileName = `${reportType.replace(":", "_")}_${scheduleId || 'manual'}_${Date.now()}.${format}`;
  const filePath = path.join(REPORTS_DIR, fileName);
  fs.writeFileSync(filePath, data);
  
  const stored = await prisma.storedReport.create({
    data: {
      scheduleId: scheduleId || null,
      reportType,
      paramsJson: JSON.stringify(params),
      filePath: `/reports/${fileName}`,
      fileFormat: format,
    },
  });
  return stored;
}

export async function runDueSchedules() {
  return processScheduledReports();
}

export async function updateSchedule(id: string, patch: any) {
  return prisma.reportSchedule.update({
    where: { id },
    data: patch
  });
}

export default {
  createSchedule,
  listSchedules,
  processScheduledReports,
  listStoredReports,
  generateAndStore,
  runDueSchedules,
  updateSchedule
};
