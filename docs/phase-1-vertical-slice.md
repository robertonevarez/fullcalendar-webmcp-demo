# Phase 1 Vertical Slice

## Architecture

```
/businesses/{slug}  →  WebMCPStatus (client)
                     →  registerBusinessTools()
                     →  fetch /api/... 
                     →  BookingService
                     →  scheduler + search (domain)
                     →  PlanetScale Postgres (`pg`)
```

WebMCP callbacks are thin: they POST to same-origin API routes. Domain logic lives in `src/domain/` and is tested without a browser.

## Business context scoping

**Decision:** Each business exposes tools on its own page at `/businesses/{slug}`. Tool descriptions include the business name, and API routes are namespaced under `/api/businesses/{slug}/...`, including appointment retrieval, reschedule, and cancel at `/api/businesses/{slug}/appointments/...`.

This avoids forcing `business_id` on every tool call while keeping catalog and availability operations unambiguous.

## Generic domain model

| Entity | Role |
|--------|------|
| `Business` | Timezone, location mode, hours, address |
| `Service` | Duration, price, keywords, location/service-area flags, resource requirements |
| `Resource` | Human or physical asset with capabilities and hours |
| `ServiceAreaZone` | Postal codes for field-service eligibility |
| `BlockedTime` | Resource unavailability |
| `Appointment` | Confirmed/cancelled booking |
| `AppointmentResource` | Many-to-many allocation (technician + bay + room) |
| `SlotToken` | Short-lived serialized slot for revalidation |

No vertical-specific scheduler branches exist. Differences are expressed through seed configuration:

- `service_area_required` and `location_policy`
- `resource_requirements` (count, type, capability)
- Resource capabilities and hours

## Multi-resource allocation

Services declare `resource_requirements` as an ordered list of `{ resource_type, quantity, capability? }`.

The scheduler:

1. Iterates candidate start times in 15-minute steps within business hours.
2. For each requirement, selects available resources matching type/capability.
3. Verifies no overlap with appointments or blocked periods for the full service duration.
4. Emits a deterministic `slot_id` hash from service, start time, and resource IDs.

`create_appointment` and `reschedule_appointment` revalidate the slot token and assert resources remain free inside a Postgres transaction (with `SELECT … FOR UPDATE`) before writing.

## Scheduling algorithm

```
candidate start time
  → business open for full duration?
  → time_preference match?
  → all resource roles satisfiable?
  → each resource free?
  → emit slot + persist slot_token (30 min TTL)
```

## Five seeded businesses

| Business | Validates |
|----------|-----------|
| Acme Heating & Air | Field service, HVAC capabilities, service area, after-4 PM slots |
| Blue Pipe Plumbing | Different capability set, separate service area |
| Northline Salon | Provider-only, no service area, stylist hours |
| Harbor Physical Therapy | Provider + treatment room |
| Mesa Auto Service | Technician + service bay compound allocation |

## WebMCP tool surface

Exact names match Phase 1 spec (aligned with Phase 0 semantics):

| Tool | readOnlyHint |
|------|----------------|
| `search_services` | true |
| `get_service_details` | true |
| `check_service_area` | true |
| `get_availability` | true |
| `create_appointment` | false |
| `get_appointment` | true |
| `reschedule_appointment` | false |
| `cancel_appointment` | false |

## Idempotency

Write tools require `idempotency_key`. Keys are scoped as `operation:businessSlug:idempotency_key` so the same client key can safely be reused across create, reschedule, and cancel without returning a stale response from a different operation. Create appointments store that same scoped key on the appointment row (which remains `UNIQUE`), so identical raw keys across businesses do not collide.

No `requestUserInteraction()` — agent-side confirmation is expected per Phase 0.

## Error taxonomy

`BUSINESS_NOT_FOUND`, `SERVICE_NOT_FOUND`, `OUTSIDE_SERVICE_AREA`, `LOCATION_REQUIRED`, `INVALID_TIME_RANGE`, `NO_AVAILABILITY`, `SLOT_UNAVAILABLE`, `RESOURCE_UNAVAILABLE`, `APPOINTMENT_NOT_FOUND`, `APPOINTMENT_NOT_RESCHEDULABLE`, `APPOINTMENT_ALREADY_CANCELLED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

Retryable: `NO_AVAILABILITY`, `SLOT_UNAVAILABLE`, `RESOURCE_UNAVAILABLE`, `INTERNAL_ERROR`

## Persistence

- **Store:** PlanetScale Postgres via `pg` (see `docs/deployment.md`)
- **Connection:** `DATABASE_URL` (PgBouncer `:6432` in production)
- **Why:** Durable transactional appointments on hosted Postgres without a local filesystem dependency

## Local development

```bash
npm install
npm run dev
npm test
```

Reset seed data: `npm run seed`

## Manual WebMCP verification

**Completed for Phase 1** across automated, direct-tool, and human inspector paths.

| Path | Status |
|------|--------|
| Automated Vitest suite | Passing (domain, e2e lifecycle, remediation, WebMCP contract/execute) |
| Direct `document.modelContext.executeTool` (Chrome + WebMCP) | Full HVAC lifecycle: search → details → area → availability → create → get → reschedule → cancel |
| Human Model Context Tool Inspector + natural-language agent | Tool discovery, selection, execution; negative `90210` → `OUTSIDE_SERVICE_AREA`; positive `78701` eligibility + availability |
| ChatGPT production in-app browser | Not separately recorded in Phase 1; primary judge path for Phase 2 submission |

Recommended judge steps remain:

1. Open `/businesses/acme-hvac` in ChatGPT's in-app browser or Chrome with WebMCP enabled.
2. Confirm eight tools appear in Model Context Tool Inspector.
3. Run HVAC flow (search → area → availability → create).
4. Spot-check `/businesses/northline-salon` or `/businesses/mesa-auto-service`.

See [webmcp-runtime-investigation.md](./webmcp-runtime-investigation.md) for the runtime execution fix and verification evidence.

## Could a sixth business be added via seed/config only?

**Yes**, for businesses that fit the same primitives:

- Single or multi resource requirements by type + capability
- Optional service-area postal lists
- Business/provider hours and blocked time
- Customer-location vs business-location services

You would **not** need scheduler changes unless the new business introduced a constraint outside this model (e.g. travel-time routing, recurring series, or capacity pools beyond per-resource calendars). Overlapping resource requirements (e.g. generic stylist + color-specialist stylist from the same pool) are handled by deterministic backtracking in the allocator.

## Known limitations

- Slot tokens expire after 30 minutes; no separate `hold_slot` tool
- Time preference parsing is heuristic (`morning`, `afternoon`, `after HH:MM`)
- No authentication (anonymous demo)
- No payments, notifications, or admin UI
- `zonedDateTimeToUtc` uses offset probing — adequate for demo timezones

## Phase 2 recommendations

Phase 2 turns this infrastructure into a challenge-ready public demo (HTTPS deploy, landing/docs, submission materials). Scheduling primitives above are intentionally stable.
