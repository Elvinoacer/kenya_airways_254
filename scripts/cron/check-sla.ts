#!/usr/bin/env node
/**
 * Simple SLA checker script. Runs through open tickets and marks SLA breaches.
 * This leverages the existing `lib/support.ts` helpers so it works with the
 * current SQLite-backed DB without requiring Prisma immediately.
 */
import path from "path";
import { listTickets, addEvent, updateTicket } from "../../lib/support";

async function run() {
  const tickets: any[] = listTickets(1000, 0) as any[];
  const now = new Date();
  for (const t of tickets) {
    if (!t.sla_due_at) continue;
    const slaDate = new Date(t.sla_due_at);
    if (t.status !== "closed" && slaDate < now) {
      // SLA breached — escalate
      addEvent(t.id, "sla_breached", { sla_due_at: t.sla_due_at });
      updateTicket(t.id, { escalation_level: (t.escalation_level || 0) + 1 });
    }
  }
}

if (require.main === module) {
  run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("SLA checker failed", err);
    process.exit(1);
  });
}
