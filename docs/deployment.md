# Deployment — Vercel + PlanetScale Postgres

**Live URL:** https://protocoltooling.com

Canonical production stack for Protocol Tooling:

```
Browser / personal agent
        ↓ WebMCP
Vercel-hosted Next.js 16 (Node runtime)
        ↓ BookingService
Deterministic scheduling domain
        ↓
PlanetScale Postgres (PgBouncer :6432)
```

## Architecture notes

- Persistence uses the `pg` driver with a module-level Pool.
- Application traffic uses PlanetScale’s **local PgBouncer** endpoint on port **6432**.
- On Vercel, `attachDatabasePool` from `@vercel/functions` registers the pool so idle connections close before Fluid compute suspension.
- Schema is applied only via committed SQL migrations (`npm run db:migrate`), never on request startup.
- Demo seed is separate (`npm run db:seed`). Startup may fill an empty catalog once; it never wipes production data.

## PlanetScale setup

1. Sign in: `pscale auth login` (interactive browser confirmation).
2. Create a **Postgres** database (not Vitess/MySQL):

```bash
pscale org switch <ORG>
pscale region list
pscale database create protocoltooling --region <REGION_SLUG> --engine postgres
```

3. Create role credentials (dashboard **Connect**, or `pscale role` / default role reset). Record host, username, password once.
4. Build connection strings:

```text
# App / Vercel (pooled)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6432/postgres?sslmode=verify-full

# Migrations / DDL (direct)
DATABASE_MIGRATE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=verify-full
```

TLS: Node `pg` uses `ssl: { rejectUnauthorized: true }` for non-localhost URLs (equivalent to `sslmode=verify-full`).

Official references:

- https://planetscale.com/docs/postgres/connecting
- https://planetscale.com/docs/postgres/tutorials/planetscale-postgres-node
- https://planetscale.com/docs/postgres/connecting/pgbouncer

## Migrate and seed

```bash
export DATABASE_MIGRATE_URL='postgresql://...@HOST:5432/postgres?sslmode=verify-full'
export DATABASE_URL='postgresql://...@HOST:6432/postgres?sslmode=verify-full'
npm run db:migrate
npm run db:seed
```

## Vercel

1. Import the GitHub repo into Vercel (framework: Next.js). Preferred project name: `protocoltooling`.
2. Set environment variables for Production (and Preview if desired):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PlanetScale PgBouncer URL (`:6432`) |
| `DEMO_RESET_TOKEN` | No | Enables protected demo reset |

3. Deploy. Node runtime is used for API routes (`export const runtime = 'nodejs'`).
4. After first deploy (or whenever schema changes): run migrate + seed against PlanetScale from a trusted machine using the env vars above.

Optional demo reset:

```bash
curl -X POST "$LIVE_URL/api/demo/reset" \
  -H "Authorization: Bearer $DEMO_RESET_TOKEN"
```

Reset clears appointments / slot tokens / idempotency rows and restores seed conflict appointments. It does **not** drop schema.

## Local development

```bash
# Optional local Postgres for convenience (not production)
createdb protocoltooling_dev
export DATABASE_URL=postgresql://localhost:5432/protocoltooling_dev
npm run db:migrate
npm run db:seed
npm run dev
```

Tests default to `postgresql://localhost:5432/protocoltooling_test` unless `DATABASE_URL` is set.

## Production smoke test

1. `GET /` → 200  
2. `GET /docs` → 200  
3. `GET /businesses/acme-hvac` → 200  
4. WebMCP / API: `search_services` → ok  
5. `check_service_area` with `90210` → `OUTSIDE_SERVICE_AREA`  
6. `check_service_area` with `78701` → eligible  
7. `get_availability` → slots  
8. `create_appointment` → confirmed  
9. Reload / new call → `get_appointment` returns the same id  
10. `reschedule_appointment` → ok  
11. `cancel_appointment` → cancelled  

Persistence across reload is the acceptance criterion.
