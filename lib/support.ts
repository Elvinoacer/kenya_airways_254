import { prisma } from "./prisma";
import crypto from "crypto";

export async function createTicket({
  name,
  email,
  subject,
  message,
  context,
}: {
  name?: string;
  email: string;
  subject?: string;
  message: string;
  context?: any;
}) {
  const ticketRef = `TKT-${Date.now().toString(36).toUpperCase()}`;
  const ticket = await prisma.supportTicket.create({
    data: {
      ticketRef,
      name: name || null,
      email,
      subject: subject || null,
      message,
      contextJson: JSON.stringify(context || {}),
    },
  });
  await addEvent(ticket.id, "created", { name, email, subject });
  return { id: ticket.id, ticketRef };
}

export async function listTickets(limit = 50, offset = 0) {
  return prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function listTicketsCursor(limit = 50, cursor?: string) {
  if (!cursor) {
    return prisma.supportTicket.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf8"),
    ) as { created_at: string; id: string };
    
    return prisma.supportTicket.findMany({
      where: {
        OR: [
          { createdAt: { lt: new Date(decoded.created_at) } },
          { createdAt: new Date(decoded.created_at), id: { lt: decoded.id } }
        ]
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  } catch (e) {
    return prisma.supportTicket.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  }
}

export function makeCursor(row: { created_at?: string; createdAt?: Date, id: string }) {
  const createdAtStr = row.createdAt ? row.createdAt.toISOString() : row.created_at;
  return Buffer.from(
    JSON.stringify({ created_at: createdAtStr, id: row.id }),
    "utf8",
  ).toString("base64");
}

export function parseCursor(cursor: string) {
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as {
      created_at: string;
      id: string;
    };
  } catch (e) {
    return null;
  }
}

export async function getTicket(id: string) {
  return prisma.supportTicket.findUnique({ where: { id } });
}

export async function updateTicket(id: string, patch: Record<string, any>) {
  const allowed = [
    "status",
    "priority",
    "assignedTo",
    "escalationLevel",
    "slaDueAt",
    "message",
    "subject",
  ];
  const data: any = {};
  for (const k of Object.keys(patch)) {
    if (!allowed.includes(k)) continue;
    data[k] = patch[k];
  }
  if (Object.keys(data).length === 0) return { changes: 0 };
  
  const res = await prisma.supportTicket.update({
    where: { id },
    data,
  });
  await addEvent(id, "updated", patch);
  return res;
}

export async function addEvent(
  ticketId: string,
  eventType: string,
  details?: any,
  actor?: string,
) {
  const event = await prisma.supportTicketEvent.create({
    data: {
      ticketId,
      eventType,
      detailsJson: JSON.stringify(details || {}),
      actor: actor || null,
    },
  });
  return { id: event.id };
}

export async function listEvents(ticketId: string) {
  return prisma.supportTicketEvent.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
}

export async function addCsat(ticketId: string, score: number, feedback?: string) {
  const csat = await prisma.supportTicketCsat.create({
    data: {
      ticketId,
      score,
      feedback: feedback || null,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      csatScore: score,
      csatFeedback: feedback || null,
      csatSubmittedAt: new Date(),
    },
  });
  await addEvent(ticketId, "csat_submitted", { score, feedback });
  return { id: csat.id };
}

export async function createLiveSession(ticketId?: string, visitorId?: string) {
  const session = await prisma.liveChatSession.create({
    data: {
      ticketId: ticketId || null,
      visitorId: visitorId || null,
    },
  });
  return { id: session.id };
}

export async function addLiveMessage(
  sessionId: string,
  sender: string,
  message: string,
  metadata?: any,
) {
  const msg = await prisma.liveChatMessage.create({
    data: {
      sessionId,
      sender,
      message,
      metadataJson: JSON.stringify(metadata || {}),
    },
  });
  return { id: msg.id };
}

export async function listLiveMessages(sessionId: string, limit = 100) {
  return prisma.liveChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export default {
  createTicket,
  listTickets,
  listTicketsCursor,
  makeCursor,
  parseCursor,
  getTicket,
  updateTicket,
  addEvent,
  listEvents,
  addCsat,
  createLiveSession,
  addLiveMessage,
  listLiveMessages,
};
