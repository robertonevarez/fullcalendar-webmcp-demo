# SQLite → PlanetScale Postgres migration notes

## Mapping

| SQLite | Postgres |
|---|---|
| `TEXT` ISO timestamps | `TIMESTAMPTZ` |
| `INTEGER` 0/1 booleans | `BOOLEAN` |
| `TEXT` JSON columns | `JSONB` |
| `INSERT OR REPLACE` | `INSERT ... ON CONFLICT DO UPDATE` |
| `?` placeholders | `$1…$n` |
| `better-sqlite3` sync | `pg` async Pool |

Domain tables are unchanged in meaning: businesses, services, resources, service_area_zones, blocked_times, appointments, appointment_resources, slot_tokens, idempotency_records.

## Call chain

```
pg Pool (src/db/client.ts)
  → async BookingRepository
  → async BookingService (loads state, sync domain, transactional writes)
  → Next.js API routes / RSC pages
```

`src/domain/scheduler.ts` stays synchronous and DB-free.

## Transactions / concurrency

Create, reschedule, and cancel mutate state inside real Postgres transactions (`BEGIN`/`COMMIT`).

Before insert/update, the repository:

1. `SELECT … FOR UPDATE` on required resources (ordered by id to avoid deadlocks)
2. `SELECT … FOR UPDATE` on overlapping confirmed appointments for those resources
3. Re-checks overlaps in application code
4. Writes appointment + allocations (+ idempotency) atomically

Limitation: we did not add GiST exclusion constraints (would need `btree_gist` / range types). Transactional locking + overlap checks provide the challenge guarantee that two concurrent attempts cannot both reserve the same resource/time window.

## Schema workflow

- Committed SQL: `db/migrations/001_initial.sql`
- Runner: `npm run db:migrate` (records `schema_migrations`)
- Seed: `npm run db:seed` (separate from DDL)
- App startup does not create tables

## Why not Prisma / Drizzle

Existing explicit SQL + repository abstraction were preserved. PlanetScale’s Node guidance recommends `pg` through PgBouncer for Vercel.
