# Protocol Tooling Demo & Showcase

Interactive showcase and visual WebMCP demonstration application for **Protocol Tooling**.

This repository contains the human-facing presentation, marketing landing page, interactive `/demo` agent simulation, and visual WebMCP inspection surfaces. It operates as an external client application consuming the core [Protocol Tooling](https://github.com/robertonevarez/protocoltooling) infrastructure.

> **Core Infrastructure Repository:** [robertonevarez/protocoltooling](https://github.com/robertonevarez/protocoltooling)

---

## Features

- **Interactive AI Agent Walkthrough (`/demo`):** Side-by-side demonstration showing the customer agent conversation beside the business website and real-time WebMCP tool execution.
- **Visual WebMCP Overlay & Inspection:** Real-time visual trace showing search, service-area verification, availability calculation, and booking confirmation.
- **Showcase Landing Page:** Modern product presentation explaining agent-native booking for service businesses.
- **WebMCP Debugger (`/webmcp-debug`):** Runtime diagnostic interface for inspecting WebMCP capabilities in browser environments (such as ChatGPT's in-app browser or Chrome with `#enable-webmcp-testing`).
- **External Backend Integration:** Typed client layer (`ProtocolToolingClient`) for interacting with the canonical Protocol Tooling API.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
# Optional: Target canonical Protocol Tooling infrastructure backend
NEXT_PUBLIC_PROTOCOLTOOLING_API_URL=https://protocoltooling.com
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the showcase landing page or [http://localhost:3000/demo](http://localhost:3000/demo) for the interactive demo experience.

---

## Scripts

- `npm run dev`: Start Next.js development server
- `npm test`: Run vitest suite for presentation, walkthroughs, and visual sequence state
- `npm run build`: Build production Next.js application
- `npm run lint`: Run ESLint checks

---

## Related Repositories

- **Core Infrastructure & WebMCP Engine:** [robertonevarez/protocoltooling](https://github.com/robertonevarez/protocoltooling) — Agent-native scheduling infrastructure, domain logic, WebMCP tool definitions, PostgreSQL persistence, and API implementation.

---

## License

MIT
