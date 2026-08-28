# Demo video script

**Constraint (current challenge rules):** public YouTube video **under 3 minutes** with clear audio.  
**Target runtime:** ~2:15–2:30.

## Shot list

### 0:00–0:20 — Problem
Voiceover: “Booking websites force humans—and agents—to navigate forms, calendars, and service taxonomies.”

Visual: landing page contrast section (Without WebMCP vs With Protocol Tooling).

### 0:20–0:40 — Concept
Voiceover: “Protocol Tooling lets service businesses expose scheduling capabilities directly through WebMCP.”

Visual: hero + flow Intent → Agent → WebMCP → Engine → Booked. Call out tools: `search_services`, `check_service_area`, `get_availability`, `create_appointment`.

### 0:40–1:30 — Live HVAC demo
Open `/businesses/acme-hvac` in ChatGPT in-app browser or Chrome inspector.

Prompt:
```text
I need someone to look at my AC tomorrow after 4.
The upstairs isn't cooling.
I'm in 78701.
Find the right service and tell me what's available.
```

Show: discovery → area eligible → slots → confirmation → `create_appointment` → confirmed.

Optional 10s: `90210` returns outside service area (deterministic constraint).

### 1:30–1:50 — Multi-vertical
Quick cuts: salon, physical therapy, auto pages.

Voiceover: “The same scheduler supports providers, rooms, technicians, service bays, and field-service constraints.”

### 1:50–2:15 — Architecture
Show `/docs` tool list briefly + architecture diagram from README.

Voiceover: “User intent to agent to WebMCP to a deterministic scheduling engine—not DOM scraping.”

### 2:15–end — Close
Voiceover: “Don't make agents fill out booking forms. Give them capabilities.”

End card: live URL + GitHub repo.
