## Backend Infrastructure Plan — Overview

This document outlines initial scaffolding added to the repo and recommended next steps for hardening and productionizing backend infrastructure.

Scaffolded helpers

- `lib/prisma.ts` — lazy Prisma client wrapper (use `getPrisma()`)
- `lib/redis.ts` — lazy Redis client wrapper (use `getRedis()`)
- `lib/queue.ts` — in-memory queue fallback with retry/dead-letter handling
- `scripts/cron/check-sla.ts` — cron script to detect SLA breaches
- `scripts/webhook/processor.ts` — webhook signature verification and JSON parsing

Recommended next steps

1. Install and configure Prisma
   - Add `prisma` dev dependency and `@prisma/client` runtime.
   - Create a `prisma/schema.prisma` mapping your current tables (or run `prisma db pull`).
   - Generate client: `npx prisma generate`.

2. Migrate to PostgreSQL for production
   - Use a managed Postgres DB with connection pooling (PgBouncer or the DB provider's pool).
   - Update `DATABASE_URL` and test migrations locally.

3. Add indexes and monitor slow queries
   - Add appropriate indexes for lookups (e.g., `support_tickets(ticket_ref)`, `support_ticket_events(ticket_id)`).
   - Enable Postgres `pg_stat_statements` for slow-query capture.

4. Redis caching and API response caching
   - Use `ioredis` and the `lib/redis.ts` wrapper.
   - Add HTTP response cache headers and an optional server-side cache layer with key namespacing and TTLs.

Caching patterns and helpers

- `lib/cache.ts` provides `cacheGet`, `cacheSet` and `cacheGetOrSet` helpers.
- Use `cacheGetOrSet(key, ttl, fetcher)` in API routes to reduce DB load.

Rate limiting

- Prefer Redis-backed rate limiting for distributed environments. `lib/rateLimiter.ts` provides `isAllowed(key, limit, windowSeconds)` and falls back to in-memory store for single-instance dev.

Indexing and migrations

- `scripts/migrations/add-indexes.sql` contains recommended index statements for Postgres/SQLite. Run this against your production DB as part of a migration pipeline.

Batching & API efficiency

- Add server-side batching endpoints for common fanout patterns. Example: `POST /api/batch` to fetch multiple tickets in one query.

Connection pooling

- For Postgres, use `pg.Pool` or rely on Prisma's connection pool configuration. See `scripts/connection/pg-pool-example.ts`.

5. Background jobs and queues
   - Replace `lib/queue.ts` with BullMQ / Bee-Queue backed by Redis.
   - Add retry strategies, backoff, and dead-letter queues.

6. Cron and scheduled workers
   - Use `node-cron` or host-level cron to run `scripts/cron/check-sla.ts` regularly.

7. Webhook processing
   - Validate signatures, enqueue processing jobs, and create idempotency keys.

8. Observability
   - Add metrics (Prometheus, Grafana), request tracing (OpenTelemetry), and logging (structured JSON).

Commands to run locally (after installing deps)

```
npm install prisma @prisma/client ioredis bullmq
npx prisma init
npx prisma db pull # or `prisma migrate` workflow
npx prisma generate
```
