# FullCalendar WebMCP Demo

A minimal enterprise FullCalendar host used to demonstrate the FullCalendar WebMCP integration published by [Protocol Tooling](https://protocoltooling.com).

This branch includes **Phase D1.1** hardening on top of D1: durable local persistence, corrupt-storage self-repair, month-scoped demo state, and a hidden `?reset=1` recovery path. There is still no agent/chat UI — WebMCP remains invisible infrastructure.

## What you should see

Opening the app shows a full-page FullCalendar instance in `dayGridMonth` with generic enterprise operational events. Human drag/resize and agent tool calls both persist through the same local repository.

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
LocalCalendarEventRepository (month-scoped localStorage)
        ↓
FullCalendar host state
```

## Seed / persistence strategy

- Seed events are generated relative to the current calendar month with stable IDs.
- Persistence is scoped per year-month (`…:v1:YYYY-MM`), so returning next month starts a fresh seeded demo while mutations within the active month survive reload.
- Invalid localStorage payloads are detected and rewritten with fresh seeds.

## WebMCP tools

Registered by `@protocoltooling/fullcalendar`:

- `calendar_get_context`
- `calendar_list_events`
- `calendar_get_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`
