# Protocol Tooling Demo — Agent Notes

- This repository is a minimal Next.js FullCalendar host for the FullCalendar WebMCP demo.
- Phase D1 wires `@protocoltooling/fullcalendar`, a browser-local `CalendarEventRepository`, and the six calendar WebMCP tools.
- Phase D1.1 hardens localStorage validation/self-repair, a fixed Aug–Oct 2026 demo window, dense September seeds, and `?reset=1`.
- The canonical seed set is mixed timed / all-day / multi-day (persistence key `…:v4:2026-aug-oct`); FullCalendar uses `America/New_York` with native `eventTimeFormat` + `displayEventEnd`.
- Phase D4 is visual-only: FullCalendar Pulse theme + palette/CSS overrides in `src/calendar/calendar-theme.css`. Do not change WebMCP, seeds, persistence, or validRange for design work.
- Phase D4.1 aligns Inter typography and Blume-inspired surface tokens with Protocol Tooling, plus ID-derived presentation-only event colors in `src/calendar/event-palette.ts`.
- Phase D4.2 replaces FullCalendar’s built-in toolbar with Base UI (`Toolbar`, `ToggleGroup`/`Toggle`, `Tooltip`) in `CalendarToolbar` / `CalendarEventContent`. FullCalendar remains the calendar engine (`headerToolbar={false}`); interact through `CalendarApi` only.
- Phase D5 adds agent mutation feedback. `observable-repository.ts` decorates the repository so a successful write reports whether it was a create / reschedule / rename / delete; `mutation-bus.ts` queues those signals, tagged `agent` or `human`, until the matching `onEventsChanged` consumes them. Two layers consume the signal: Web Animations FLIP in `event-motion.ts`, and a `data-pt-mutation` emphasis ring plus a polite live region (`CalendarAnnouncer`). The ring pulses three times (`--pt-emphasis-pulses`) and lives on a `::after` animating `opacity` — animating the `box-shadow` colour instead silently degrades to discrete interpolation, because Chrome cannot interpolate `color-mix(… currentColor …)` against `transparent`. Human drag/resize is deliberately excluded — the pointer already showed it. A mutation whose destination falls outside the range the current view draws (`isDayVisible`, which reads `data-date` day cells: 42 in Month, 7 in Week, 1 in Day) is a departure, not a move — it exits at the source with a directional drift and carries its mark to the destination view. Do not use the View Transitions API here; see `docs/d5/README.md` for the measured reason it cannot animate a dayGrid move.
- Uses `@protocoltooling/fullcalendar@^0.2.0` with optional host-selected `metadata` (location / attendees / team) on a subset of seeds. Private seed fields (`tenantId`, `billingCode`, `privateNotes`) are never written into `CalendarEvent.metadata`. Persistence key is `…:v4:2026-aug-oct`. No calendar UI chrome was added for metadata.
- Calendar UI lives in `src/calendar/CalendarApp.tsx`.
- Seed events and demo window constants live in `src/calendar/seed-events.ts`.
- Persistence adapter lives in `src/calendar/local-calendar-repository.ts`.
- Do not add agent/chat/product chrome. Prefer keeping the source tree small and obvious.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
