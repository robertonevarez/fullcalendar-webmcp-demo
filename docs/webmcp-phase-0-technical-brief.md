# WebMCP Phase 0 Technical Brief

**Date:** 2026-08-25  
**Scope:** Reconnaissance only — no application implementation  
**Challenge:** [The WebMCP Challenge](https://webmcp.devpost.com/) (OpenAI, Devpost-managed)

---

## Executive summary

WebMCP is a **draft W3C Community Group API** (spec dated **2026-08-19**) that lets a web page register **structured, JSON-Schema-described JavaScript tools** on `document.modelContext`. Browser-resident agents discover and invoke those tools; execution runs as **normal page JavaScript** in the tool owner's document, inheriting cookies, session, and origin context. A page is conceptually an **in-browser MCP-like tool server**, not a replacement for backend MCP over HTTP/stdio.

**Verified:** The OpenAI WebMCP Challenge (Aug 25 – Sep 3, 2026) expects judges to test via **ChatGPT's in-app browser** (WebMCP supported out of the box) **or Chrome with** `chrome://flags/#enable-webmcp-testing`. Production Chrome can also use the **origin trial** (Chrome 149–156).

**Recommendation:** This booking-infrastructure project should use the **Imperative API** exclusively. Scheduling requires dynamic availability, qualification constraints, and stateful appointment operations that do not map cleanly to declarative HTML forms.

**Recommendation:** The product thesis remains **technically sound**: expose business truth and scheduling constraints as WebMCP tools; let the user's personal agent own conversational interpretation. WebMCP is a strong fit for deterministic scheduling APIs called from an authenticated browser session.

**Risk:** There is **no normative `requestUserInteraction()` / `ModelContextClient` in the August 2026 spec**. Consequential appointment tools must implement **in-page confirmation UI** and/or rely on **agent-side confirmation** — do not assume a browser-mediated confirmation API exists today.

---

## Current challenge environment

### Verified facts

| Item | Detail |
|------|--------|
| **Submission deadline** | **Sep 3, 2026 @ 1:00pm PDT** (Devpost shows Sep 3 @ 4:00pm EDT) |
| **Registration opened** | Aug 25, 2026 @ 12:00pm PT |
| **Winners announced** | ~Sep 23, 2026 (may shift) |
| **Primary judge test path** | **ChatGPT in-app browser** — "supports WebMCP out of the box" |
| **Secondary judge test path** | **Google Chrome** with `chrome://flags/#enable-webmcp-testing` enabled |
| **Live URL** | Required; any host (Vercel, Netlify, Render, Cloudflare, ChatGPT Sites, etc.) |
| **Public repo** | Required with **detectable open-source license** in repo About |
| **Demo video** | Public YouTube, **under 3 minutes**, audio explaining build + WebMCP usage |
| **Pre-existing code** | Allowed — "Create a new WebMCP-enabled app **or add WebMCP support to an existing one**" |
| **Auth for judges** | Optional; credentials can be supplied on submission form |

### Chrome / API surface

| Item | Status |
|------|--------|
| **Current API entry point** | **`document.modelContext`** (spec + Chrome docs, Aug 2026) |
| **Deprecated** | **`navigator.modelContext`** — deprecated in **Chrome 150**; use feature detection fallback during transition |
| **Chrome origin trial** | Chrome **149–156**; register origin + serve token (header or meta) for production without flag |
| **Local dev flag** | `chrome://flags/#enable-webmcp-testing` |
| **HTTPS** | **Required** — API is `[SecureContext]`; **`localhost` qualifies** as secure context |
| **Origin isolation** | **Required** — WebMCP disabled if origin is not stable (e.g. `document.domain` / `Origin-Agent-Cluster: ?0`) |
| **Headless** | Not the primary design target; Chrome docs warn WebMCP is for local browser workflows with human in loop |
| **Tool discoverability** | Client must **visit the page** — no remote discovery without navigation |
| **Cross-browser** | **Chrome + ChatGPT in-app browser** are the challenge-relevant targets; Firefox/Safari uncommitted |
| **Inspector extension** | Model Context Tool Inspector — manual tool listing, execution, schema validation |

### Verified testing instructions (Devpost + Chrome)

1. Deploy to HTTPS (or test on localhost).
2. Register tools via `document.modelContext.registerTool(...)`.
3. **Primary:** Open deployed URL in **ChatGPT in-app browser** and exercise tools through the agent.
4. **Secondary:** Chrome with WebMCP testing flag (and/or valid origin-trial token on production domain).
5. Use Model Context Tool Inspector for deterministic debugging without an agent.

### Unknown / Risk

- **Unknown:** Exact ChatGPT in-app browser Chrome version, flag state, and whether it uses origin-trial tokens or a built-in enablement path.
- **Risk:** Third-party blog posts still document `navigator.modelContext` and `client.requestUserInteraction()` — treat as **non-authoritative** unless confirmed against the Aug 2026 spec.
- **Risk:** Some reports indicate origin-trial tokens alone may not expose the API without the testing flag on certain Chrome builds — **optimize for ChatGPT in-app browser** as the judge-critical path; document Chrome flag steps in README.

---

## WebMCP execution model

### What WebMCP is (technical)

WebMCP is a **browser-native tool registration and invocation protocol**. Each `Document` has an associated `ModelContext` object exposing:

- `registerTool(tool, options?)` — register a callable tool
- `getTools(options?)` — list tools visible to the calling document (in-page agents)
- `executeTool(tool, inputObject, options?)` — invoke a discovered tool
- `ontoolchange` / `toolchange` — notify when tool registry changes

**Browser agents** (ChatGPT in-app browser, Gemini in Chrome, extensions) use an **implementation-defined internal observation mechanism** — not necessarily `getTools()` — to collect tools from active documents. The spec explicitly states it does **not** prescribe MCP as the wire format to the agent.

### Execution flow

```
User → Personal agent → Browser mediates → document.modelContext tool map
                                              → execute() callback in page JS
                                              → JSON-serialized return value → agent
```

1. **Registration:** Page JS calls `registerTool`; tool stored in document's tool map; `toolchange` fires.
2. **Discovery:** Agent/browser collects tool name, description, inputSchema, origin, annotations.
3. **Invocation:** Browser validates cross-origin policy, parses input against schema (implementation-dependent), queues execution on **target document's event loop**.
4. **Execution:** Page's `execute(input, { signal })` runs — same realm as the site's application code.
5. **Response:** Return value JSON-stringified and passed back; rejections become failed executions.

### Distinctions

| Mechanism | What it is | How it differs from WebMCP |
|-----------|------------|----------------------------|
| **WebMCP** | Page registers typed tools; browser/agent invokes `execute` | Structured contract; runs site JS |
| **Traditional MCP** | Server process (stdio/HTTP/SSE) exposing tools/resources/prompts | Off-page; persistent server; full MCP primitives |
| **Browser automation / DOM** | Agent infers UI from DOM/a11y/screenshots | Fragile, slow, ambiguous; no schema contract |
| **Website REST/GraphQL API** | HTTP endpoints | Agent needs API keys, custom integration; outside browser session |
| **Backend MCP for same business** | MCP server wrapping scheduling API | Complementary — WebMCP is the **browser-session** surface; backend MCP could serve non-browser agents |

### Standalone MCP server required?

**Verified: No.** WebMCP tools execute in client-side script. A backend scheduling API is still needed for **persistence and business logic**, but it is accessed via `fetch` inside tool callbacks — not as a substitute for WebMCP registration.

### Page / origin / session context

**Verified:**

- Tools belong to a **`Document`**, not the browser globally — hence the move from `navigator.modelContext` to `document.modelContext`.
- Default visibility: **same origin** in the frame tree + browser agents.
- Cross-origin access requires **`Permissions-Policy: tools`** (iframe `allow="tools"`) **and** optional `exposedTo: [origins]` on registration.
- Tool names are unique **per document's model context**; duplicate registration throws `InvalidStateError`.

---

## Imperative API

### Registration syntax (verified)

```javascript
const controller = new AbortController();

await document.modelContext.registerTool({
  name: 'get_availability',           // 1–128 chars: [A-Za-z0-9_.-]
  title: 'Get availability',          // optional display label
  description: 'Returns bookable appointment slots for a service in a date range.',
  inputSchema: {
    type: 'object',
    properties: {
      service_id: { type: 'string', description: 'Catalog service identifier.' },
      start_date: { type: 'string', format: 'date' },
      end_date: { type: 'string', format: 'date' },
      postal_code: { type: 'string', description: 'Service location postal code.' },
    },
    required: ['service_id', 'start_date', 'end_date', 'postal_code'],
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  execute: async (input, { signal }) => {
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
    if (!res.ok) return { error: { code: 'UNAVAILABLE', message: await res.text() } };
    return res.json();
  },
}, { signal: controller.signal });

// Unregister: controller.abort();
```

### Lifecycle rules (verified)

| Behavior | Detail |
|----------|--------|
| **Duplicate name** | `InvalidStateError` |
| **Empty name/description** | Rejected |
| **Invalid inputSchema** | Rejected at registration |
| **Unregister** | Pass `AbortSignal` in register options; abort removes tool |
| **Chrome 153+** | Abort unregisters without cancelling in-flight executions |
| **Dynamic updates** | Unregister + re-register (or new name); race possible if same name reused immediately |
| **Cancellation** | Agent/user can abort; `execute` receives `signal` — pass to `fetch` |

### Annotations (verified — only two)

| Annotation | Purpose |
|------------|---------|
| `readOnlyHint: true` | Signals no state mutation — helps agents skip confirmation |
| `untrustedContentHint: true` | Signals UGC/external data in output — agent should treat as untrusted |

**Verified: No `destructiveHint`, `openWorldHint`, or MCP-style full annotation set in the Aug 2026 spec.**

### Output expectations

- `execute` may return any JSON-serializable value (object, array, string, number, boolean).
- Chrome recommends **≤1.5K characters per tool output** for agent guardrails.
- **Recommendation:** Return structured objects with `{ ok: true, data }` / `{ ok: false, error: { code, message, retryable } }` — not ambiguous prose.

### Error behavior

- Thrown/rejected `execute` → failed tool execution (`UnknownError` to caller in spec steps).
- **Recommendation:** Prefer returning structured error objects so agents can retry with corrected args.

### Restrictions on callbacks

**Verified:** Callbacks run as ordinary page script — subject to CSP, same-origin fetch rules, and user consent. No separate sandbox. They **may** mutate DOM, navigate (return `null` from `executeTool` when navigation triggered), call existing app APIs, read `localStorage`, etc.

---

## Declarative API

### Current status (verified)

Implemented in Chrome origin trial. Annotate HTML forms:

- `toolname`, `tooldescription` on `<form>` — required for registration
- `toolparamdescription` on fields — optional schema hints
- `toolautosubmit` — agent can submit without manual click
- `SubmitEvent.agentInvoked`, `SubmitEvent.respondWith(Promise)` — return data without navigation
- Events: `toolactivated`, `toolcancel` on `window`
- CSS: `:tool-form-active`, `:tool-submit-active`

### Challenge usability

**Verified:** Usable in challenge environment (same flag/trial/ChatGPT browser). Declarative tools appear alongside imperative tools to agents.

### Usefulness for booking infrastructure

**Recommendation: Limited / supplementary only.**

| Fit | Reason |
|-----|--------|
| **Poor** | Dynamic availability across technicians, qualifications, service areas, existing appointments |
| **Poor** | Multi-step agent flows (discover service → check area → query slots → confirm → book) |
| **OK** | Static demo forms (e.g. contact/support) on marketing pages |
| **OK** | Progressive enhancement fallback for simple "request callback" intake |

Declarative forms **bring the form into focus** and pre-fill fields — good for human-visible collaboration, awkward for headless agent-first booking infrastructure.

---

## Lifecycle

### Page and navigation behavior (verified)

| Event | Tool behavior |
|-------|---------------|
| **Initial HTML load** | No tools until JS registers them |
| **Tools register** | `toolchange` event; visible to agent on next observation |
| **React/Next.js hydrate** | Register after mount in client component; use `AbortController` on unmount |
| **Client-side route change** | Previous document tools **cleared on unload**; new route must re-register |
| **Full page reload** | Fresh document — re-register |
| **Navigate to other origin** | Old origin tools gone; new origin separate registry |
| **Background tab / bfcache** | Spec: queued tool execution runs when document becomes active again |
| **Re-register same name** | Must unregister first (or use different name) |
| **Auth login/logout** | **Recommendation:** Abort registration scope on logout; re-register authenticated tools after login |

### Scoping summary

**Verified:**

- Tools are **document-scoped**, not origin-global persistent.
- **Not persistent across navigation** within SPA unless JS re-registers on each view.
- **Dynamically discoverable** after registration via `toolchange` (in-page) and agent re-observation.

### Where registration belongs (Recommendation)

For Next.js App Router:

1. **`WebMCPProvider` client component** mounted in root layout or agent-surface layout only (not every marketing page unless needed).
2. Register **stable catalog/read tools** once on agent surface mount.
3. Register **contextual tools** (e.g. `get_appointment` when `appointment_id` in session) with per-route `AbortController`.
4. Feature-detect: `document.modelContext?.registerTool`.

---

## Authentication and browser context

### Verified

WebMCP invocation **is webpage JavaScript in the site's origin**. Tool callbacks:

- **Can use** existing cookies and session cookies on `fetch(..., { credentials: 'include' })`
- **Can use** CSRF tokens from page meta or cookie — same as normal SPA
- **Can read** `localStorage` / `sessionStorage` if same origin
- **Can access** in-memory application state (React context, etc.)
- **Inherit** the user's authenticated browser session when the agent opens the page while logged in

There is **no separate WebMCP security context** — identity inheritance is explicit in the spec's security section (agents carry user credentials).

### Production implications (Recommendation)

- Treat every tool call as an **authenticated API request** from the current browser user.
- **Do not** expose admin tools on customer-facing pages.
- Re-verify authorization **inside every tool callback** (and backend) — tool descriptions are not a security boundary.
- For demo: optional judge credentials via submission form; keep test accounts scoped.

---

## Security and consequential actions

### Read vs write classification

| Tool class | Examples | `readOnlyHint` | Confirmation |
|------------|----------|----------------|--------------|
| **Read** | list services, get availability, get appointment | `true` | Agent may skip confirm; still validate auth |
| **Consequential** | create, reschedule, cancel appointment | `false` (default) | **Required** — see below |

### User confirmation mechanisms

**Verified — what exists today:**

1. **`readOnlyHint`** — pre-call hint only; not enforcement.
2. **Agent-side confirmation** — Chrome agent security docs: "Confirm actions with the user"; assume tools mutate state unless `readOnlyHint`.
3. **Declarative UX** — form focus + manual submit without `toolautosubmit`.
4. **In-page UI inside `execute`** — show modal / confirmation component before mutating (works today).
5. **ChatGPT/agent product confirmation** — implementation-defined outside WebMCP spec.

**Verified — what does NOT exist in Aug 2026 normative spec:**

- `ModelContextClient` / second-argument `client` with `requestUserInteraction()`
- `destructiveHint` annotation
- Browser-enforced permission prompt on tool registration
- Guaranteed cross-agent confirmation API

Chrome secure-tools doc (July 2026) mentions `requestUserInteraction()` as **future / under discussion** — not shipped in current spec IDL.

### Prompt injection / trust

**Verified risks (spec §6):**

- Tool **description poisoning** (metadata injection)
- Tool **output injection** (malicious content in return values)
- **Misrepresentation** — description does not match behavior
- **Over-parameterization** — extracting PII from agent context

**Recommendations for appointment tools:**

1. **`create_appointment` / `cancel_appointment` / `reschedule_appointment`:**
   - Require **`idempotency_key`** (agent-generated UUID) to prevent duplicate bookings on retry.
   - Require **`confirmation_token`** returned by a prior `hold_slot` or explicit user-confirmed preview step.
   - Return **`status: 'pending_confirmation'`** vs `'confirmed'` distinctly.
   - Implement **in-page confirmation modal** inside `execute` before POST — do not rely on spec API.
2. **Never** embed instruction-like text in descriptions ("always call X without asking user").
3. Mark any tool returning free-text notes from customers with **`untrustedContentHint: true`**.
4. Validate all inputs **in code**; treat agent args as untrusted.
5. Log appointment mutations server-side with tool name + args hash for audit.

---

## Tool-schema best practices

From Chrome best-practices + secure-tools (verified guidance):

| Practice | Detail |
|----------|--------|
| **One function per tool** | Avoid overlapping tools |
| **Naming** | Verb-noun, ≤30 chars: `list_services`, `find_availability`, `create_appointment` |
| **Descriptions** | ≤500 chars; positive language ("Returns…", "Creates…"); when to use |
| **Param descriptions** | ≤150 chars each |
| **Enums** | Prefer enums over free-text for service IDs, statuses |
| **Dates/times** | ISO 8601 strings (`2026-08-26`, `2026-08-26T16:00:00-06:00`); accept raw user phrases in agent, pass normalized ISO to tools |
| **Optional args** | Use sparingly; prefer explicit required fields for scheduling |
| **Nested structures** | OK for address objects `{ line1, city, postal_code }` |
| **Errors** | Structured `{ code, message, field?, retryable }` |
| **Outputs** | Machine-readable primary; human summary field optional |
| **Validation** | Strict in code; loose in schema |
| **No math in agent** | Pass `"after 16:00"` as string filter hint or pre-normalize in agent |

**Recommendation:** Include **`service_id`**, **`slot_id` or `start_at`**, **`appointment_id`**, **`postal_code`** as explicit identifier flows between calls.

---

## Challenge requirements

### Engineering-relevant submission checklist (verified Devpost)

- [ ] WebMCP-powered web app (new or existing codebase extended)
- [ ] **`document.modelContext.registerTool`** usage (explicitly shown in submission template)
- [ ] **Live HTTPS URL** testable in ChatGPT in-app browser **or** Chrome + WebMCP flag
- [ ] **Public git repo** with OSS license visible in About
- [ ] Source + assets + **README** (setup, run, test WebMCP)
- [ ] **<3 min YouTube demo** with audio
- [ ] Text description: WebMCP fit, UX improvement, human+agent collaboration, implementation summary
- [ ] Optional auth credentials for judges on submission form

### Not required by Devpost (verified absence)

- Specific framework, database, or vertical
- Declarative API usage
- Separate MCP server
- Customer chat UI

---

## Judging implications

| Criterion | Engineering translation |
|-----------|-------------------------|
| **WebMCP Leverage** | Many **real, non-trivial tools**; imperative registration tied to live scheduling logic; visible tool discovery in ChatGPT browser; not a single echo tool |
| **Execution** | End-to-end **working** deploy; coherent agent-surface + docs; demo video proves tool calls succeed |
| **Potential Impact** | Credible **service-business scheduling** pain point; show before/after vs manual booking / DOM scraping |
| **Creativity & Ambition** | **Agent-native** booking (personal agent as UI); multi-tool orchestration; constraint-rich HVAC demo — avoid generic CRUD |

**Recommendation:** Optimize demo for **ChatGPT in-app browser** recording — judges include OpenAI Browser Platform Lead and Chrome Distinguished Engineer.

---

## Proposed booking capability model

### Design principle (challenge)

> Infrastructure owns business truth and deterministic scheduling constraints. Personal agent owns conversational interpretation.

**Validated:** WebMCP best practices say "trust the agent to complete the task" and accept raw user strings — aligns with agent-side interpretation. Infrastructure must return **canonical service IDs, slot boundaries, eligibility booleans, and prices** — not NLP matching inside tools.

### Critique of proposed tool list

| Proposed tool | Verdict | Notes |
|---------------|---------|-------|
| `search_services` | **Keep (rename optional)** | Prefer `list_services` with optional `query` filter — avoid `match_service(description)` embedding NLP in infrastructure |
| `get_service_details` | **Keep → `get_service`** | Key by `service_id`; return duration, price range, qualifications, intake fields |
| `check_service_area` | **Keep** | Narrow read tool; returns `{ eligible, zone_id, message }` |
| `get_availability` | **Keep → `find_availability`** | Accept `service_id`, location, date range, **`time_preference`** string (agent-normalized or raw) |
| `create_appointment` | **Keep** | Consequential; needs idempotency + in-page confirm |
| `get_appointment` | **Keep** | By `appointment_id` |
| `reschedule_appointment` | **Keep** | Consequential; takes `appointment_id` + new slot |
| `cancel_appointment` | **Keep** | Consequential |

### Missing primitives (Recommendation)

| Tool | Purpose |
|------|---------|
| **`hold_slot`** (optional Phase 1) | Short-lived lock on `slot_id` before create — reduces double-book race |
| **`list_intake_fields`** or include in `get_service` | Agent knows required issue description / access notes |
| **Structured errors on all tools** | Agent self-correction |

### `match_service(description)` vs `search_services(query)`

**Recommendation: Reject `match_service`.**

- Semantic matching belongs in the **personal agent** (user said "AC not cooling" → agent selects `hvac-diagnostic` from catalog).
- Infrastructure returns **`list_services`** with `id`, `name`, `category`, `keywords[]`, `description` — agent performs mapping.
- Optional **`query` string param** on `list_services` for **substring/keyword filter only** (deterministic), not LLM calls in backend.

### Identifier flow (Recommendation)

```
list_services → service_id
check_service_area(postal_code) → zone_id + eligible
find_availability(service_id, postal_code, range, time_preference) → slot_id[] + start_at/end_at
hold_slot(slot_id)? → hold_token
create_appointment(service_id, slot_id, customer, issue, idempotency_key, hold_token?) → appointment_id
get/reschedule/cancel_appointment(appointment_id)
```

---

## Recommended WebMCP tool surface

### Phase 1 minimum (8 tools)

| Tool | readOnlyHint | Consequential |
|------|--------------|---------------|
| `list_services` | true | no |
| `get_service` | true | no |
| `check_service_area` | true | no |
| `find_availability` | true | no |
| `create_appointment` | false | **yes** |
| `get_appointment` | true | no |
| `reschedule_appointment` | false | **yes** |
| `cancel_appointment` | false | **yes** |

### Deferred

- `hold_slot` — Phase 1.5 if double-booking appears in testing
- Declarative forms — marketing contact only, if needed

---

## Vertical-slice interaction trace

**Business:** Fictional HVAC company — multiple services, technicians, zones, qualifications, business hours, durations, prices, existing appointments.

**User:** "I need someone to look at my AC tomorrow after 4. The upstairs isn't cooling."

Assume agent has user address on file (`postal_code: 78701`).

### Scenario 1 — New booking

| Step | Tool | Input (summary) | Return (summary) |
|------|------|-----------------|------------------|
| 1 | `list_services` | `{ query: "AC cooling" }` | `[{ id: "hvac-diagnostic", name: "AC Diagnostic Visit", duration_min: 90, ... }, ...]` |
| 2 | `get_service` | `{ service_id: "hvac-diagnostic" }` | `{ qualifications: ["hvac"], intake_fields: ["symptom_location", "issue_description"], price_estimate_cents: 8900 }` |
| 3 | `check_service_area` | `{ postal_code: "78701" }` | `{ eligible: true, zone_id: "austin-central" }` |
| 4 | `find_availability` | `{ service_id: "hvac-diagnostic", postal_code: "78701", start_date: "2026-08-26", end_date: "2026-08-26", time_preference: "after 16:00" }` | `{ slots: [{ slot_id: "s-4821", start_at: "2026-08-26T16:30:00-05:00", technician_id: "t-12", ... }, ...] }` |
| 5 | Agent presents options to user | — | User picks 4:30pm slot |
| 6 | `create_appointment` | `{ service_id, slot_id: "s-4821", customer: {...}, issue: { description: "Upstairs not cooling", location: "upstairs" }, idempotency_key: "uuid" }` | **In-page confirm modal** → `{ appointment_id: "appt-991", status: "confirmed", start_at: "..." }` |

**Gap exposed:** Agent must normalize "tomorrow" to date — **correct** (agent job). Infrastructure returns **only real slots** after 16:00 local.

### Scenario 2 — "Actually make it Friday morning instead."

| Step | Tool | Input | Return |
|------|------|-------|--------|
| 1 | `find_availability` | `{ ..., start_date: "2026-08-29", end_date: "2026-08-29", time_preference: "morning" }` | New slots |
| 2 | `reschedule_appointment` | `{ appointment_id: "appt-991", new_slot_id: "s-5102", idempotency_key }` | `{ appointment_id, status: "confirmed", start_at: "2026-08-29T09:00:00-05:00" }` |

**Alternative:** `cancel` + `create` — worse UX; **prefer reschedule** if same service.

### Scenario 3 — "Never mind, cancel it."

| Step | Tool | Input | Return |
|------|------|-------|--------|
| 1 | `get_appointment` | `{ appointment_id: "appt-991" }` | `{ status: "confirmed", cancellable: true, policy: "free cancellation until 24h before" }` |
| 2 | Agent confirms with user | — | User confirms |
| 3 | `cancel_appointment` | `{ appointment_id: "appt-991", reason: "customer_request", idempotency_key }` | `{ status: "cancelled" }` |

---

## Architecture constraints for Phase 1

```
User
  ↓
Personal AI agent (ChatGPT / other)
  ↓
Browser (ChatGPT in-app browser primary)
  ↓
Business WebMCP surface (HTTPS Next.js or similar — agent/docs/demo page)
  ↓ document.modelContext.registerTool × N
  ↓ execute → fetch (credentials: include)
Scheduling / domain backend (API routes + in-memory or lightweight DB for demo)
```

**Do:**

- Imperative API on a dedicated **agent capability page** (e.g. `/agent` or `/mcp`)
- Feature-detect `document.modelContext`
- Static tool registration module + route-aware unregister
- README with ChatGPT browser + Chrome flag test steps
- Structured JSON tool outputs

**Do not (Phase 1):**

- Customer booking wizard or calendar UI as primary product
- Chatbot embedded in site
- Backend LLM for service matching
- Depend on `requestUserInteraction()` or standalone MCP server for core path
- Declarative forms for scheduling logic

---

## Unknowns / risks

| ID | Type | Item |
|----|------|------|
| U1 | Unknown | ChatGPT in-app browser WebMCP parity with Chrome flag behavior |
| U2 | Unknown | Whether production Chrome needs **both** origin-trial token **and** flag for judges using Chrome |
| U3 | Unknown | OpenAI "WebMCP guide" URL content (linked from Devpost Resources tab — not fully fetched) |
| U4 | Risk | Spec/API drift (`navigator` → `document`; possible future `client` parameter) |
| U5 | Risk | No browser-enforced confirmation — demo may book without user intent if agent + tool omit guards |
| U6 | Risk | Tool output size limits (~1.5K) may constrain large availability lists — paginate slots |
| U7 | Risk | Judging in 9 days — scope must stay minimal |
| U8 | Risk | Over-lapping tools confuse agents — keep catalog reads separate from availability |

---

## Phase 1 Entry Criteria

Before implementation starts, the following must be **decided and documented**:

1. **Hosting target** — HTTPS deploy URL (Vercel/Netlify/etc.) confirmed working.
2. **Test environment** — Primary: ChatGPT in-app browser; fallback: Chrome + `#enable-webmcp-testing`.
3. **API surface** — Imperative only; exact 8-tool names/schemas frozen in OpenAPI-style doc or TypeScript types.
4. **Confirmation strategy** — In-page React modal inside consequential `execute` callbacks + agent verbal confirm (no `requestUserInteraction` assumption).
5. **Auth approach for demo** — Anonymous vs judge test account; if auth, credentials for submission form.
6. **Data store** — Minimal (SQLite/Postgres/in-memory JSON) with seed HVAC catalog, 2–3 technicians, zones, appointments.
7. **Agent page route** — Single URL judges open in ChatGPT browser (e.g. `/agent`).
8. **Idempotency** — Required on all write tools.
9. **Time zone** — Fixed zone for demo (e.g. `America/Chicago`) encoded in availability responses.
10. **Open-source license** — MIT/Apache-2.0 chosen for public repo.

---

## Recommended Phase 1 Scope

**Goal:** Smallest vertical slice proving:

```
natural-language user intent
        ↓
personal agent reasoning
        ↓
WebMCP service discovery (page visit)
        ↓
availability calculation
        ↓
human confirmation
        ↓
appointment creation
```

### In scope

1. **Deployable web app** with:
   - Marketing/docs landing (minimal — explains agent-native booking, lists tools)
   - **`/agent` WebMCP surface** registering 8 imperative tools
2. **Fictional HVAC seed data** — 3+ services, 2+ technicians, zone table, business hours, existing appointments affecting availability
3. **Backend API routes** called from tool `execute` — deterministic scheduling (no LLM)
4. **Tools:** `list_services`, `get_service`, `check_service_area`, `find_availability`, `create_appointment`, `get_appointment`, `reschedule_appointment`, `cancel_appointment`
5. **Consequential tool safety:** in-page confirmation UI + `idempotency_key` + structured errors
6. **README:** setup, seed data, test in ChatGPT browser + Chrome inspector
7. **Demo script** aligned to vertical-slice scenarios for video

### Out of scope (Phase 1)

- Admin dashboard, calendar UI, customer chat
- Declarative API (unless trivial contact form)
- Standalone MCP server
- Production multi-tenant auth / payments
- `hold_slot` (unless race discovered in testing)
- Mobile/native clients

### Success criteria

- [ ] All 8 tools visible in Model Context Tool Inspector on `/agent`
- [ ] ChatGPT in-app browser completes Scenario 1 end-to-end on deployed URL
- [ ] `create_appointment` cannot commit without in-page confirmation
- [ ] Reschedule + cancel scenarios work on existing `appointment_id`
- [ ] Public repo + license + <3 min demo video ready for Sep 3 submission

---

## Sources

### Normative / first-party (primary)

| Source | URL |
|--------|-----|
| WebMCP Draft Community Group Report (2026-08-19) | https://webmachinelearning.github.io/webmcp/ |
| WebMCP GitHub explainer | https://github.com/webmachinelearning/webmcp |
| Chrome WebMCP overview | https://developer.chrome.com/docs/ai/webmcp |
| Chrome Imperative API | https://developer.chrome.com/docs/ai/webmcp/imperative-api |
| Chrome Declarative API | https://developer.chrome.com/docs/ai/webmcp/declarative-api |
| Chrome WebMCP best practices | https://developer.chrome.com/docs/ai/webmcp/best-practices |
| Chrome WebMCP tool security | https://developer.chrome.com/docs/ai/webmcp/secure-tools |
| Chrome Agent security for WebMCP | https://developer.chrome.com/docs/agents/security |
| Declarative API explainer (GitHub) | https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md |

### Challenge (primary)

| Source | URL |
|--------|-----|
| Devpost — The WebMCP Challenge | https://webmcp.devpost.com/ |
| OpenAI WebMCP Challenge landing | https://openai.com/webmcp-challenge/ |

### Reference implementations (secondary)

| Source | URL |
|--------|-----|
| GoogleChromeLabs webmcp-tools (demos) | https://github.com/GoogleChromeLabs/webmcp-tools |
| WebMCP explainer live demo (booking widget) | https://googlechromelabs.github.io/webmcp-tools/demos/explainer/ |
| Flight search imperative demo source | https://github.com/GoogleChromeLabs/webmcp-tools/tree/main/demos/react-flightsearch |
| Google Chrome modern-web-guidance (WebMCP guides) | https://github.com/GoogleChrome/modern-web-guidance-src/tree/main/guides/webmcp |

### Explicitly not used as normative

- Third-party cheat sheets referencing `navigator.modelContext` / `requestUserInteraction` as current IDL
- Older proposal drafts predating `document.modelContext` migration

---

*End of Phase 0 brief. Do not begin application implementation until Phase 1 Entry Criteria are accepted.*
