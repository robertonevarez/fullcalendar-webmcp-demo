# FullCalendar WebMCP Demo

A minimal enterprise FullCalendar host used to demonstrate the FullCalendar WebMCP integration published by [Protocol Tooling](https://protocoltooling.com).

There is no embedded agent/chat UI. The calendar itself is the demo surface; WebMCP tools are invisible infrastructure for an external WebMCP-capable browser or agent.

## What you should see

Opening the app shows a full-page FullCalendar locked to **August–October 2026**, starting in **Month** view on **September** (navigate prev/next for August and October).

The canonical seed set is a mixed operations calendar:

- **Timed** appointments with varied business-hour durations (majority)
- **All-day** items where that semantics fit (inventory, drills, planning days)
- **Multi-day** operations with FullCalendar exclusive-end dates

Month view shows start–end time text on timed events. **Week** and **Day** views place the same events on the time grid. Human drag/resize and agent tool calls both persist through one browser-local repository.

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

Restore the deterministic timed seed calendar without opening DevTools:

```text
/?reset=1
```

## Architecture

```text
External Agent / WebMCP inspector
        ↓
useFullCalendarWebMCP
        ↓
LocalCalendarEventRepository (Aug–Oct 2026 localStorage window)
        ↓
FullCalendar host state
```

Agent mutations and human drag/resize converge on the same authoritative store. Reloading the page keeps the latest persisted events; `/?reset=1` rewrites the store from the canonical seeds.

## Seed / persistence strategy

- The calendar `validRange` is fixed to August–October 2026 (`initialDate` = Sep 1; exclusive end `2026-11-01`).
- FullCalendar `timeZone` is `America/New_York`. Timed seeds use explicit Eastern offsets (EDT −04:00 throughout this window).
- Persistence uses one window key (`…:v4:2026-aug-oct`). Bumping the key version forces browsers that still hold older datasets onto the new seeds.
- Invalid localStorage payloads are detected and rewritten with fresh seeds.

## FullCalendar options of note

| Option | Value | Why |
| --- | --- | --- |
| `initialView` | `dayGridMonth` | Month remains the default overview |
| `timeZone` | `America/New_York` | Consistent wall-clock display across visitors |
| `eventTimeFormat` | 12-hour with short meridiem | Readable Month/Week/Day time labels |
| `displayEventEnd` | `true` | Show start–end ranges in Month view |

## WebMCP tools

Registered by `@protocoltooling/fullcalendar`:

- `calendar_get_context`
- `calendar_list_events`
- `calendar_get_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`
