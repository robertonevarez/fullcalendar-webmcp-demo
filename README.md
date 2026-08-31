# FullCalendar WebMCP Demo

A minimal enterprise FullCalendar host used to demonstrate the FullCalendar WebMCP integration published by [Protocol Tooling](https://protocoltooling.com).

This branch is **Phase D0**: the host calendar surface only. WebMCP wiring (`@protocoltooling/fullcalendar`), repository/persistence, and external-agent validation are deferred to Phase D1.

## What you should see

Opening the app shows a full-page FullCalendar instance in `dayGridMonth` with generic enterprise operational events. There is no chat UI, assistant panel, or product chrome around the calendar.

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## Seed date strategy

Events are generated relative to the current calendar month with stable IDs (for example `seed-site-survey`). Placement is deterministic so the demo stays populated as months change, and tests can assert predictable IDs without hard-coding a single stale month.
