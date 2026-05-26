import { prisma } from "./prisma";
import notifications from "./notifications";

export async function createThread(
  participants: string[],
  subject?: string,
  createdBy?: string,
) {
  const thread = await prisma.messageThread.create({
    data: {
      subject: subject || null,
      participantsJson: JSON.stringify(participants || []),
      createdBy: createdBy || null,
    },
  });
  return { id: thread.id };
}

export async function getThread(id: string) {
  return prisma.messageThread.findUnique({ where: { id } });
}

export async function listThreadsForUser(userId: string, limit = 50) {
  // SQLite JSON querying is limited in Prisma, so we'll fetch more and filter, or use raw if needed.
  // Using a simplistic contains workaround for Prisma on SQLite string matching for JSON.
  // Since we migrated to PostgreSQL, we can use JSON array containment or just LIKE if it's stored as string.
  // We mapped it as String in Prisma, so we use string matching.
  return prisma.messageThread.findMany({
    where: {
      participantsJson: { contains: `"${userId}"` }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function sendMessage({
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
    const thr = await createThread(
      [from, ...(to || [])],
      metadata?.subject || null,
      from,
    );
    tid = thr.id;
  }
  const message = await prisma.message.create({
    data: {
      threadId: tid,
      senderId: from,
      content,
      metadataJson: JSON.stringify(metadata || {}),
    },
  });
  
  for (const u of to || []) {
    await prisma.messageReceipt.create({
      data: {
        messageId: message.id,
        userId: u,
        deliveredChannels: "in-app",
      },
    });
    await notifications.createInAppNotification(
      u,
      "message",
      metadata?.title || "New message",
      content,
      { threadId: tid, messageId: message.id },
    );
  }
  return { id: message.id, threadId: tid };
}

export async function getMessagesInThread(threadId: string, limit = 200) {
  const messages = await prisma.message.findMany({
    where: { threadId },
    include: { receipts: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  // Flatten for backwards compatibility
  return messages.map(m => {
    const receipt = m.receipts[0];
    return {
      ...m,
      recipient: receipt?.userId,
      is_read: receipt?.read,
      read_at: receipt?.readAt,
    };
  });
}

export async function markMessageRead(messageId: string, userId: string) {
  const receipt = await prisma.messageReceipt.findFirst({
    where: { messageId, userId },
  });
  if (!receipt) return false;
  await prisma.messageReceipt.update({
    where: { id: receipt.id },
    data: { read: true, readAt: new Date() },
  });
  return true;
}

export async function addMessageTemplate(
  name: string,
  channel: string,
  subjectTemplate: string | null,
  bodyTemplate: string,
) {
  const template = await prisma.messageTemplate.create({
    data: {
      name,
      channel,
      subjectTemplate,
      bodyTemplate,
    },
  });
  return { id: template.id };
}

export async function listMessageTemplates() {
  return prisma.messageTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function broadcastAnnouncement({
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
  if (!targetUserIds) {
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const u of users) {
      await notifications.createInAppNotification(
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
    await notifications.createInAppNotification(
      uid,
      "announcement",
      subject || "Announcement",
      message,
      { from },
    );
  }
  return { ok: true, count: (targetUserIds || []).length };
}

export async function getCommunicationHistoryForUser(userId: string, limit = 100) {
  const msgs = await prisma.message.findMany({
    where: { receipts: { some: { userId } } },
    select: { id: true, content: true, createdAt: true },
  });
  const msgsMapped = msgs.map(m => ({ ...m, kind: 'message' }));
  
  const notifs = await prisma.notification.findMany({
    where: { userId },
    select: { id: true, message: true, createdAt: true },
  });
  const notifsMapped = notifs.map(n => ({ id: n.id, content: n.message, createdAt: n.createdAt, kind: 'notification' }));
  
  const combined = [...msgsMapped, ...notifsMapped]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
