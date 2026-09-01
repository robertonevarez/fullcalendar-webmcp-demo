# FullCalendar WebMCP Demo

A live demonstration of `@protocoltooling/fullcalendar` by Roberto Nevarez.

People and agents operate the same calendar state. There is no embedded chat UI: WebMCP is the agent interface, and FullCalendar remains the human interface.

[Open the live demo](https://protocoltooling.com/demo) · [Package and source](https://github.com/robertonevarez/fullcalendar-webmcp) · [Documentation](https://protocoltooling.com/integrations/fullcalendar)

## Try it with an agent

Open the demo in ChatGPT's in-app browser or Chrome with WebMCP enabled.

Example prompts:

- “What do I have scheduled next Wednesday?”
- “Move the warehouse inspection to 3 PM.”
- “Create a 45-minute site inspection tomorrow at 2 PM.”

Then drag an event manually and ask the agent when that event is scheduled. Human edits and agent tool calls converge on the same repository.

## Reset

Restore the canonical demo calendar at any time:

```text
https://protocoltooling.com/demo?reset=1
```

## WebMCP tools

Registered by `@protocoltooling/fullcalendar`:

- `calendar_get_context`
- `calendar_list_events`
- `calendar_get_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`

## Architecture

```text
External WebMCP agent
        ↓
@protocoltooling/fullcalendar
        ↓
LocalCalendarEventRepository
        ↓
FullCalendar UI
```

The demo uses localStorage so each browser gets an isolated, persistent sandbox. Reloading keeps changes. `?reset=1` restores the deterministic seed set.

The reusable package does not require localStorage. Production hosts can implement the same repository contract against their existing API and database.

## Demo window

The calendar is intentionally fixed to August–October 2026 and starts on September 1.

- FullCalendar timezone: `America/New_York`
- Month, week, and day views use the same event state
- Timed and all-day events are included
- Human drag/resize and WebMCP mutations both persist

## Run locally

```bash
npm install
npm run dev
```

Verification:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## License

MIT © 2026 Roberto Nevarez
