# FullCalendar WebMCP Demo

A minimal enterprise FullCalendar host used to demonstrate the FullCalendar WebMCP integration published by [Protocol Tooling](https://protocoltooling.com).

This branch is **Phase D1**: the host uses `@protocoltooling/fullcalendar`, a browser-local `CalendarEventRepository`, and registers the real WebMCP calendar tools. There is still no agent/chat UI — WebMCP remains invisible infrastructure.

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

## Architecture

```text
External Agent / WebMCP inspector
        ↓
useFullCalendarWebMCP (@protocoltooling/fullcalendar)
        ↓
LocalCalendarEventRepository (localStorage)
        ↓
FullCalendar host state
```

## Seed date strategy

Events are generated relative to the current calendar month with stable IDs (for example `seed-site-survey`) the first time local storage is empty. Clear site data for `localhost` to re-seed.

## WebMCP tools

Registered by `@protocoltooling/fullcalendar`:

- `calendar_get_context`
- `calendar_list_events`
- `calendar_get_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`
