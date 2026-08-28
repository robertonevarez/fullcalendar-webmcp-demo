# WebMCP Discovery Handoff

**Date:** 2026-08-26  
**Status:** Resolved and deployed  
**Commit:** `f7b02c2` — *Fix WebMCP tool discovery with polling and early registration.*  
**Production:** https://protocoltooling.com

---

## Summary

Protocol Tooling exposes eight WebMCP tools per business page (`/businesses/{slug}`). ChatGPT was not discovering tools on the Acme HVAC demo page. Investigation traced the failure to **registration lifecycle timing**, not incorrect tool schemas or booking logic. After fix and deploy, discovery and invocation work end-to-end in **ChatGPT Work** with GPT-5.6 Terra/Sol.

---

## Original symptom

- Acme HVAC page open in ChatGPT built-in browser
- **Site Tools** indicator did not appear / tools not exposed to the agent
- Expected flow (`search_services` → `check_service_area` → `get_availability` → …) could not run

---

## Root cause

| Issue | Detail |
|-------|--------|
| **One-shot registration** | Old `WebMCPStatus` checked `document.modelContext` once in `useEffect`. ChatGPT may inject the API **after** initial paint. |
| **Late lifecycle** | Registration ran after React hydration of a component at the **bottom** of the page. |
| **Error conflation** | Any failure displayed as “WebMCP API not available,” masking registration errors vs missing API. |
| **All-or-nothing** | One failed `registerTool` rejected the whole batch with no per-tool reporting. |
| **Missing headers** | No explicit `Origin-Agent-Cluster: ?1` (WebMCP requires origin-isolated documents). |

**Not the cause:** Tool schemas, execute handlers, or API routes — Chrome inspector had already verified full lifecycle prior to this bug (see `docs/webmcp-runtime-investigation.md`).

---

## Fix (deployed)

1. **`waitForModelContext()`** — Poll up to 10s for `document.modelContext.registerTool`
2. **`WebMCPBusinessProvider`** — Register at page root via `useLayoutEffect` (earliest React lifecycle)
3. **Per-tool error isolation** — Continue registering remaining tools if one fails
4. **Structured status panel** — `WebMCP supported` / `Registration attempted` / registered tool list / dev-only errors
5. **Headers** — `Origin-Agent-Cluster: ?1`, `Permissions-Policy: tools=(self)`
6. **Diagnostic page** — `/webmcp-debug` registers single read-only `ping` tool

### Key files

| File | Role |
|------|------|
| `src/webmcp/lifecycle.ts` | Polling, `registerBusinessToolsWhenReady`, `registerPingTool` |
| `src/webmcp/tools.ts` | Tool definitions, per-tool registration, execute wrapper |
| `src/components/WebMCPBusinessProvider.tsx` | Root provider + context |
| `src/components/WebMCPRegistrar.tsx` | Early registration hook |
| `src/components/WebMCPStatus.tsx` | Observability UI |
| `next.config.ts` | Origin isolation headers |
| `tests/webmcp-registration.test.ts` | Lifecycle tests (41 total tests passing) |

---

## Verification evidence

### Automated

- `npm test` — 41 passing (contract, execute, registration lifecycle, domain, e2e)
- `npm run build` — clean

### Production headers

```text
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

### ChatGPT Work (2026-08-26)

**Page:** https://protocoltooling.com/businesses/acme-hvac  
**Mode:** ChatGPT Work, GPT-5.6 Terra Light, built-in browser

**Prompt:**

```text
I need someone to look at my AC tomorrow after 4.
The upstairs isn't cooling.
I'm in 78701.
Find the right service and tell me what's available.
```

**Tools invoked (Sources panel):**

- `search_services`
- `check_service_area`
- `get_service_details`
- `get_availability`
- `webmcp_list_tools`

**Result:** 78701 eligible; AC Diagnostic Visit ($89, 90 min); James Carter slots Thu Aug 27, 4:00–5:45 PM (15-min increments).

### Site Tools UI

Eight tools discovered: 5 read (`search_services`, `get_service_details`, `check_service_area`, `get_availability`, `get_appointment`), 3 write (`create_appointment`, `reschedule_appointment`, `cancel_appointment`).

---

## Client limitations (external)

| Environment | Discovery | Invocation |
|-------------|-----------|------------|
| **ChatGPT Work / Codex** + built-in browser + Sol/Terra | ✅ | ✅ |
| **Regular ChatGPT chat** | May read page HTML | ❌ Site tools often **not wired to model** |
| **GPT-5.6 Luna** | — | WebMCP disabled per OpenAI docs |
| **Enterprise / Edu** | — | Site tools not available |
| **Chrome + `#enable-webmcp-testing`** | ✅ | ✅ (Model Context Tool Inspector) |
| **Conventional browser tab** | ❌ | ❌ No `document.modelContext` |

**Important:** `/webmcp-debug` only registers `ping`. Booking prompts require `/businesses/acme-hvac`.

**Settings:** ChatGPT → Settings → Browser → Permissions → **Enable site tools**

References:

- https://learn.chatgpt.com/docs/webmcp
- https://webmachinelearning.github.io/webmcp/
- https://developer.chrome.com/docs/ai/webmcp

---

## How to test (manual)

1. Open https://protocoltooling.com/businesses/acme-hvac in **ChatGPT Work** built-in browser
2. Confirm **Site tools** shows 8 tools
3. Confirm status panel: WebMCP supported **yes**, 8 registered tools
4. Run read-path prompt (above)
5. Optional write path: `create_appointment` after human confirmation (use idempotency_key)

**Fallback oracle:** Chrome with WebMCP flag + Model Context Tool Inspector.

---

## Related docs

- `docs/webmcp-runtime-investigation.md` — Execute wrapper fix (Chrome `{ signal }` destructuring)
- `docs/webmcp-phase-0-technical-brief.md` — Spec summary and tool surface
- `docs/challenge-submission-checklist.md` — Devpost checklist
- `docs/deployment.md` — Vercel + PlanetScale

---

## Handoff prompt (copy into new session)

```text
# Context: Protocol Tooling WebMCP — Discovery Fix (Complete)

Protocol Tooling (https://protocoltooling.com) exposes agent-native booking via WebMCP on `/businesses/{slug}`. Eight tools register per business page via `document.modelContext.registerTool`.

## What was broken
ChatGPT was not discovering WebMCP tools on `/businesses/acme-hvac`. Root cause: one-shot `useEffect` registration with no retry for late `modelContext` injection, plus late mount at page bottom.

## What was fixed (commit f7b02c2, deployed)
- Poll up to 10s for `document.modelContext`
- Register at page root via `WebMCPBusinessProvider` + `useLayoutEffect`
- Per-tool error handling, structured status panel, origin isolation headers
- Diagnostic page: `/webmcp-debug` (ping tool only)

## Verified working
- Site Tools UI: 8 tools on acme-hvac
- ChatGPT Work (GPT-5.6 Terra): full read path — search_services → check_service_area(78701) → get_availability → real slots
- 41 automated tests passing

## Known external limitation
Site tools work in **ChatGPT Work / Codex** built-in browser, NOT regular ChatGPT chat. Luna model has WebMCP disabled. Use Sol or Terra.

## Key files
- src/webmcp/lifecycle.ts, src/webmcp/tools.ts
- src/components/WebMCPBusinessProvider.tsx, WebMCPRegistrar.tsx, WebMCPStatus.tsx
- docs/webmcp-discovery-handoff.md (full handoff)

## Demo prompt
I need someone to look at my AC tomorrow after 4. The upstairs isn't cooling. I'm in 78701. Find the right service and tell me what's available.

## Do not
- Replace WebMCP with conventional MCP or HTML scraping
- Hard-code Acme-specific behavior into generic infrastructure
- Assume regular ChatGPT chat will invoke site tools
```
