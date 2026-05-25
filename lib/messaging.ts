import { query } from "./db";
import notifications from "./notifications";

function makeId(prefix = "m-") {
  return (
    prefix +
    ((globalThis as any).crypto?.randomUUID?.() ||
      String(Date.now()) + Math.random().toString(36).slice(2))
  );
}

export function createThread(
  participants: string[],
  subject?: string,
  createdBy?: string,
) {
  const id = makeId("thread-");
  query.run(
    `INSERT INTO message_threads (id, subject, participants_json, created_by) VALUES (?, ?, ?, ?)`,
    [
      id,
      subject || null,
      JSON.stringify(participants || []),
      createdBy || null,
    ],
  );
  return { id };
}

export function getThread(id: string) {
  return query.get(`SELECT * FROM message_threads WHERE id = ?`, [id]);
}

export function listThreadsForUser(userId: string, limit = 50) {
  return query.all(
    `SELECT * FROM message_threads WHERE json_extract(participants_json, '$') LIKE ? ORDER BY created_at DESC LIMIT ?`,
    ["%" + userId + "%", limit],
  );
}

export function sendMessage({
  threadId,
  from,
  to,
  content,
  metadata,
}: {
  threadId?: string;
  from: string;
  to: string[];
  content: string;
  metadata?: any;
}) {
  let tid = threadId;
  if (!tid) {
    const thr = createThread(
      [from, ...(to || [])],
      metadata?.subject || null,
      from,
    );
    tid = thr.id;
  }
  const mid = makeId("msg-");
  query.run(
    `INSERT INTO messages (id, thread_id, sender_id, content, metadata_json) VALUES (?, ?, ?, ?, ?)`,
    [mid, tid, from, content, JSON.stringify(metadata || {})],
  );
  // create receipts for recipients
  for (const u of to || []) {
    const rid = makeId("r-");
    query.run(
      `INSERT INTO message_receipts (id, message_id, user_id, delivered_channels) VALUES (?, ?, ?, ?)`,
      [rid, mid, u, "in-app"],
    );
    // create in-app notification for recipient
    notifications.createInAppNotification(
      u,
      "message",
      metadata?.title || "New message",
      content,
      { threadId: tid, messageId: mid },
    );
  }
  return { id: mid, threadId: tid };
}

export function getMessagesInThread(threadId: string, limit = 200) {
  return query.all(
    `SELECT m.*, mr.user_id as recipient, mr.read as is_read, mr.read_at FROM messages m LEFT JOIN message_receipts mr ON mr.message_id = m.id WHERE m.thread_id = ? ORDER BY m.created_at ASC LIMIT ?`,
    [threadId, limit],
  );
}

export function markMessageRead(messageId: string, userId: string) {
  const r: any = query.get(
    `SELECT * FROM message_receipts WHERE message_id = ? AND user_id = ?`,
    [messageId, userId],
  );
  if (!r) return false;
  query.run(
    `UPDATE message_receipts SET read = 1, read_at = datetime('now') WHERE id = ?`,
    [r.id],
  );
  return true;
}

export function addMessageTemplate(
  name: string,
  channel: string,
  subjectTemplate: string | null,
  bodyTemplate: string,
) {
  const id = makeId("tmpl-");
  query.run(
    `INSERT INTO message_templates (id, name, channel, subject_template, body_template) VALUES (?, ?, ?, ?, ?)`,
    [id, name, channel, subjectTemplate, bodyTemplate],
  );
  return { id };
}

export function listMessageTemplates() {
  return query.all(`SELECT * FROM message_templates ORDER BY created_at DESC`);
}

export function broadcastAnnouncement({
  from,
  targetUserIds,
  subject,
  message,
  channels = ["in-app"],
}: {
  from?: string;
  targetUserIds?: string[];
  subject?: string;
  message: string;
  channels?: string[];
}) {
  // If no target users provided, insert into notifications for all users (careful in production)
  if (!targetUserIds) {
    // simple broadcast via notifications table to avoid mass email in dev
    const users = query.all<any>(`SELECT id FROM users`);
    for (const u of users) {
      notifications.createInAppNotification(
        u.id,
        "announcement",
        subject || "Announcement",
        message,
        { from },
      );
    }
    return { ok: true, count: users.length };
  }
  for (const uid of targetUserIds) {
    notifications.createInAppNotification(
      uid,
      "announcement",
      subject || "Announcement",
      message,
      { from },
    );
  }
  return { ok: true, count: (targetUserIds || []).length };
}

export function getCommunicationHistoryForUser(userId: string, limit = 100) {
  // combine messages and notifications for a quick history
  const msgs = query.all(
    `SELECT m.id, m.content, m.created_at, 'message' as kind FROM messages m JOIN message_receipts mr ON mr.message_id = m.id WHERE mr.user_id = ?`,
    [userId],
  );
  const notifs = query.all(
    `SELECT id, message as content, created_at, 'notification' as kind FROM notifications WHERE user_id = ?`,
    [userId],
  );
  const combined = [...msgs, ...notifs]
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, limit);
  return combined;
}

export default {
  createThread,
  getThread,
  listThreadsForUser,
  sendMessage,
  getMessagesInThread,
  markMessageRead,
  addMessageTemplate,
  listMessageTemplates,
  broadcastAnnouncement,
  getCommunicationHistoryForUser,
};
