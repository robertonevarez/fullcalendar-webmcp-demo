# Protocol Tooling Demo — Agent Notes

- This repository is a minimal Next.js FullCalendar host for the FullCalendar WebMCP demo.
- Phase D1 wires `@protocoltooling/fullcalendar`, a browser-local `CalendarEventRepository`, and the six calendar WebMCP tools.
- Phase D1.1 hardens localStorage validation/self-repair, a fixed Sep–Nov 2026 demo window, dense September seeds, and `?reset=1`.
- Phase D4 is visual-only: FullCalendar Pulse theme + palette/CSS overrides in `src/calendar/calendar-theme.css`. Do not change WebMCP, seeds, persistence, or validRange for design work.
- Phase D4.1 aligns Inter typography and Blume-inspired surface tokens with Protocol Tooling, plus ID-derived presentation-only event colors in `src/calendar/event-palette.ts`.
- Calendar UI lives in `src/calendar/CalendarApp.tsx`.
- Seed events and demo window constants live in `src/calendar/seed-events.ts`.
- Persistence adapter lives in `src/calendar/local-calendar-repository.ts`.
- Do not add agent/chat/product chrome. Prefer keeping the source tree small and obvious.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
