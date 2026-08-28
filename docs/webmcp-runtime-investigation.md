# WebMCP Runtime Investigation (PR #2)

## Symptom

All eight registered WebMCP tools failed at runtime with:

```text
Tool was executed but the invocation failed.
For example, the script function threw an error
```

Registration, schema discovery, and agent tool selection succeeded. Only execution failed. Downstream guessed IDs after the first failure were cascading model behavior, not domain bugs.

## Reproduction

- Branch: `phase-1/multi-vertical-scheduling`
- App: `npm run dev` on `http://localhost:3456`
- Browser: Chrome 152 with `--enable-features=WebMCP,WebMCPForTesting`
- Page: `/businesses/acme-hvac`
- Confirmed: 8 tools registered via `document.modelContext.getTools()`
- Invocation: `document.modelContext.executeTool(tool, JSON.stringify({ query: "AC maintenance" }))`

Exact failure for `search_services`:

```text
UnknownError: Tool was executed but the invocation failed.
For example, the script function threw an error
```

## Isolation

| Layer | Result |
|-------|--------|
| WebMCP registration | **Passed** — 8 tools present |
| Tool callback | **Failed** — callback threw before useful work |
| fetch | **Not reached** for broken callbacks |
| API `/api/businesses/acme-hvac/search-services` | **Passed** — direct page `fetch` returned HTTP 200 with real services |
| Booking service | **Passed** (via API) |
| Domain / database | **Passed** (via API) |

Branch observed for failed invocation: **no useful request / callback crash before fetch**.

Diagnostic tools registered in-page proved Chrome's `executeTool` currently calls:

```text
execute(input)   // argc === 1, options === undefined
```

not:

```text
execute(input, { signal })
```

## Root cause

Shared tool wrappers used required destructuring of the second argument:

```ts
execute: async (input, { signal }) => postJson(url, input, signal)
```

When Chrome invoked `execute(input)` with no second argument, JavaScript threw:

```text
TypeError: Cannot destructure property 'signal' of 'undefined' as it is undefined.
```

Chrome collapsed that into the opaque inspector/agent error above. Every tool shared this wrapper pattern, so every invocation failed identically.

Evidence:

- Destructure-style probe → same opaque failure
- `options?.signal` probe + same fetch → success with real HVAC search payload
- W3C draft says `ToolExecuteCallback(input, options)` with `options.signal`, and Chrome docs show `{ signal }` when present; Chrome 152's `executeTool` path currently omits the second argument unless/until abort options are wired through

## Fix

Made the shared execute wrapper accept an optional options bag:

```ts
execute: async (input, options?) => postJson(url, input, options)
// fetch uses options?.signal
```

One shared `postJson` / `toolExecute` path covers all eight tools. Also returns a structured error if the HTTP body is not JSON, and logs `url` + status in non-production without customer PII.

## Regression coverage

Added `tests/webmcp-execute.test.ts`:

- `execute(input)` with no second arg must succeed
- `execute(input, undefined)` must not throw
- `execute(input, { signal })` forwards AbortSignal to fetch
- non-JSON HTTP bodies become structured `{ ok: false, error }` results

## Manual verification

After fix, Chrome CDP retest on `/businesses/acme-hvac` (Chrome 152 + WebMCP features):

1. Direct `fetch` to search-services: HTTP 200 with `svc_preventive` / `svc_ac_diagnostic`
2. `executeTool(search_services, '{"query":"AC maintenance"}')`: real service catalog JSON
3. `check_service_area` with `90210`: structured `OUTSIDE_SERVICE_AREA` (valid domain result)
4. Canonical HVAC lifecycle via `executeTool`:
   - `search_services` → `svc_ac_diagnostic`
   - `get_service_details` → ok
   - `check_service_area(78701)` → eligible
   - `get_availability` → 8 slots
   - `create_appointment` → `appt_<uuid>` confirmed
   - `get_appointment` → confirmed
   - `reschedule_appointment` → ok
   - `cancel_appointment` → cancelled

Automated tests: **24 passed**.

## Final cleanup (domain logging + sequencing hints)

After a successful human inspector negative-path test (`90210` → `OUTSIDE_SERVICE_AREA`):

1. **Logging:** Expected structured domain rejections (`{ ok: false, error: { code } }`, including HTTP 4xx) no longer call `console.error`, so they do not trigger a misleading Next.js red development overlay. Unexpected failures (network errors, non-JSON bodies, non-domain HTTP failures) still use `console.error` in development.
2. **Tool descriptions:** `check_service_area` and `get_availability` now state eligibility sequencing so agents skip availability for a known-ineligible service/location pair.
3. **Manual rechecks:** Negative path (`90210`) and positive path (`78701`) were revalidated via Chrome `executeTool` after this cleanup.

Do not start Phase 2 until the PR is merged and Phase 2 is intentionally kicked off.

## Remaining risks

- Chrome may later always pass `{ signal }`; optional handling remains compatible.
- Spec vs Chrome `executeTool` input type still differs (object vs JSON string). Inspector uses object-first with string fallback; callers should follow current Chrome docs/inspector.
- Agents may still occasionally make one redundant availability call; descriptions reduce but cannot eliminate that without client-side orchestration.
- ChatGPT production in-app browser should be confirmed against the Phase 2 deployed HTTPS URL (Chrome inspector + executeTool paths are already verified).
- Do not start speculative Phase 3 product work until the challenge submission is complete.
