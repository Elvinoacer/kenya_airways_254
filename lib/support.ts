import { query } from "./db";
import crypto from "crypto";

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
}

export function createTicket({
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
  const id = uuid();
  const ticketRef = `TKT-${Date.now().toString(36).toUpperCase()}`;
  query.run(
    `INSERT INTO support_tickets (id, ticket_ref, name, email, subject, message, context_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      ticketRef,
      name || null,
      email,
      subject || null,
      message,
      JSON.stringify(context || {}),
    ],
  );
  addEvent(id, "created", { name, email, subject });
  return { id, ticketRef };
}

export function listTickets(limit = 50, offset = 0) {
  return query.all(
    `SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

export function listTicketsCursor(limit = 50, cursor?: string) {
  if (!cursor) {
    return query.all(
      `SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
  }
  // cursor expected as opaque base64 JSON { created_at, id }
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf8"),
    ) as { created_at: string; id: string };
    return query.all(
      `SELECT * FROM support_tickets WHERE (created_at < ?) OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT ?`,
      [decoded.created_at, decoded.created_at, decoded.id, limit],
    );
  } catch (e) {
    // fallback to simple created_at comparison if parsing fails
    return query.all(
      `SELECT * FROM support_tickets WHERE created_at < ? ORDER BY created_at DESC LIMIT ?`,
      [cursor, limit],
    );
  }
}

export function makeCursor(row: { created_at: string; id: string }) {
  return Buffer.from(
    JSON.stringify({ created_at: row.created_at, id: row.id }),
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

export function getTicket(id: string) {
  return query.get(`SELECT * FROM support_tickets WHERE id = ?`, [id]);
}

export function updateTicket(id: string, patch: Record<string, any>) {
  const allowed = [
    "status",
    "priority",
    "assigned_to",
    "escalation_level",
    "sla_due_at",
    "message",
    "subject",
  ];
  const sets: string[] = [];
  const params: any[] = [];
  for (const k of Object.keys(patch)) {
    if (!allowed.includes(k)) continue;
    sets.push(`${k} = ?`);
    params.push(patch[k]);
  }
  if (sets.length === 0) return { changes: 0 };
  params.push(id);
  const res = query.run(
    `UPDATE support_tickets SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params,
  );
  addEvent(id, "updated", patch);
  return res;
}

export function addEvent(
  ticketId: string,
  eventType: string,
  details?: any,
  actor?: string,
) {
  const id = uuid();
  query.run(
    `INSERT INTO support_ticket_events (id, ticket_id, event_type, details_json, actor) VALUES (?, ?, ?, ?, ?)`,
    [id, ticketId, eventType, JSON.stringify(details || {}), actor || null],
  );
  return { id };
}

export function listEvents(ticketId: string) {
  return query.all(
    `SELECT * FROM support_ticket_events WHERE ticket_id = ? ORDER BY created_at ASC`,
    [ticketId],
  );
}

export function addCsat(ticketId: string, score: number, feedback?: string) {
  const id = uuid();
  query.run(
    `INSERT INTO support_ticket_csat (id, ticket_id, score, feedback) VALUES (?, ?, ?, ?)`,
    [id, ticketId, score, feedback || null],
  );
  query.run(
    `UPDATE support_tickets SET csat_score = ?, csat_feedback = ?, csat_submitted_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [score, feedback || null, ticketId],
  );
  addEvent(ticketId, "csat_submitted", { score, feedback });
  return { id };
}

export function createLiveSession(ticketId?: string, visitorId?: string) {
  const id = uuid();
  query.run(
    `INSERT INTO live_chat_sessions (id, ticket_id, visitor_id) VALUES (?, ?, ?)`,
    [id, ticketId || null, visitorId || null],
  );
  return { id };
}

export function addLiveMessage(
  sessionId: string,
  sender: string,
  message: string,
  metadata?: any,
) {
  const id = uuid();
  query.run(
    `INSERT INTO live_chat_messages (id, session_id, sender, message, metadata_json) VALUES (?, ?, ?, ?, ?)`,
    [id, sessionId, sender, message, JSON.stringify(metadata || {})],
  );
  return { id };
}

export function listLiveMessages(sessionId: string, limit = 100) {
  return query.all(
    `SELECT * FROM live_chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?`,
    [sessionId, limit],
  );
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
