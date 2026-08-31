# FullCalendar WebMCP Demo

A minimal enterprise FullCalendar host used to demonstrate the FullCalendar WebMCP integration published by [Protocol Tooling](https://protocoltooling.com).

This branch includes **Phase D4.1** on top of D4: Inter typography and Blume-aligned surface tokens matching Protocol Tooling, plus a restrained deterministic event palette for same-day differentiation. Behavior, seeds, persistence, and WebMCP tools are unchanged. There is still no agent/chat UI — WebMCP remains invisible infrastructure.

## What you should see

Opening the app shows a full-page FullCalendar locked to **September–November 2026**, starting on September, with a dense enterprise seed calendar for that month. Human drag/resize and agent tool calls both persist through the same local repository.

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## Reset demo state

Restore the deterministic seed calendar without opening DevTools:

```text
/?reset=1
```

## Architecture

```text
External Agent / WebMCP inspector
        ↓
useFullCalendarWebMCP
        ↓
LocalCalendarEventRepository (Sep–Nov 2026 localStorage window)
        ↓
FullCalendar host state
```

## Seed / persistence strategy

- The calendar `validRange` is fixed to September–November 2026 (`initialDate` = Sep 1).
- Seeds densely fill September and lightly cover October and November with stable IDs.
- Persistence uses one window key (`…:v1:2026-sep-nov`); `/?reset=1` rewrites that store from seeds.
- Invalid localStorage payloads are detected and rewritten with fresh seeds.

## WebMCP tools

Registered by `@protocoltooling/fullcalendar`:

- `calendar_get_context`
- `calendar_list_events`
- `calendar_get_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`
