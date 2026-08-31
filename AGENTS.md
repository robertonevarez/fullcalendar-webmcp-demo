# Protocol Tooling Demo — Agent Notes

- This repository is a minimal Next.js FullCalendar host for the FullCalendar WebMCP demo.
- Phase D1 wires `@protocoltooling/fullcalendar`, a browser-local `CalendarEventRepository`, and the six calendar WebMCP tools.
- Calendar UI lives in `src/calendar/CalendarApp.tsx`.
- Seed events live in `src/calendar/seed-events.ts`.
- Persistence adapter lives in `src/calendar/local-calendar-repository.ts`.
- Do not add agent/chat/product chrome. Prefer keeping the source tree small and obvious.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
