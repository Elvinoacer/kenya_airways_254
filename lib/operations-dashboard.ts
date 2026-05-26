import { prisma } from "./prisma";

export async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activeFlightsCount = await prisma.flightSchedule.count({
    where: {
      status: { in: ["BOARDING", "DEPARTED", "IN_FLIGHT", "DELAYED"] }
    }
  });

  const scheduledTodayCount = await prisma.flightSchedule.count({
    where: {
      departureTime: { gte: today }
    }
  });
  
  const staffOnDutyCount = await prisma.employeeSchedule.count({
    where: {
      scheduleDate: today.toISOString().split('T')[0],
      status: "SCHEDULED" // Assuming scheduled means they will be on duty
    }
  });
  
  // Recent alerts mock (replace with actual alert logic if table exists)
  const recentAlerts = await prisma.flightStatusUpdate.findMany({
    where: { status: "DELAYED", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    include: { schedule: { include: { flight: true } } },
    orderBy: { createdAt: "desc" },
    take: 5
  }).then(updates => updates.map(u => ({
    id: u.id,
    type: "DELAY",
    flight_number: u.schedule.flight.flightNumber,
    message: u.note || u.reason || "Flight delayed",
    time: u.createdAt
  })));

  return {
    active_flights: activeFlightsCount,
    scheduled_today: scheduledTodayCount,
    staff_on_duty: staffOnDutyCount,
    alerts: recentAlerts,
  };
}

export async function getActiveFlights(limit = 20) {
  const schedules = await prisma.flightSchedule.findMany({
    where: {
      status: { in: ["BOARDING", "DEPARTED", "IN_FLIGHT", "DELAYED", "SCHEDULED"] },
      departureTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    include: { flight: true, aircraft: true, gate: true },
    orderBy: { departureTime: "asc" },
    take: limit
  });
  
  return schedules.map(s => ({
    id: s.id,
    flight_id: s.flight.id,
    flight_number: s.flight.flightNumber,
    origin: s.flight.origin,
    destination: s.flight.destination,
    departure_time: s.departureTime,
    arrival_time: s.arrivalTime,
    status: s.status,
    aircraft: s.aircraft?.registration,
    gate: s.gate?.gateCode,
  }));
}
