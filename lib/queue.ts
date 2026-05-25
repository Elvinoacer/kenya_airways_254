/**
 * Minimal in-memory queue implementation with retry and dead-letter support.
 * Intended as a lightweight fallback when a real queue (BullMQ, Bee-Queue)
 * isn't available. Use `enqueue()` to add jobs and `process()` to register
 * a handler. Jobs are persisted in-memory only.
 */

type Job = {
  id: string;
  name: string;
  data: any;
  attempts: number;
  maxAttempts: number;
};

const queues: Record<string, Job[]> = {};

export function enqueue(
  queueName: string,
  name: string,
  data: any,
  opts?: { maxAttempts?: number },
) {
  const id = String(Date.now()) + Math.random().toString(36).slice(2);
  const job: Job = {
    id,
    name,
    data,
    attempts: 0,
    maxAttempts: opts?.maxAttempts ?? 3,
  };
  queues[queueName] = queues[queueName] || [];
  queues[queueName].push(job);
  return job;
}

export function getPending(queueName: string) {
  return (queues[queueName] || []).slice();
}

export async function process(
  queueName: string,
  handler: (job: Job) => Promise<void>,
) {
  queues[queueName] = queues[queueName] || [];
  while (queues[queueName].length > 0) {
    const job = queues[queueName].shift() as Job;
    try {
      await handler(job);
    } catch (err) {
      job.attempts++;
      if (job.attempts < job.maxAttempts) {
        // requeue with backoff (simple push)
        queues[queueName].push(job);
      } else {
        // dead-letter: emit to console for now
        // eslint-disable-next-line no-console
        console.error("Job failed and reached max attempts", {
          queueName,
          job,
          err,
        });
      }
    }
  }
}

export default { enqueue, getPending, process };
