# Product demo (`/demo`)

## Purpose

`/demo` is a **self-driving, deterministic product walkthrough**.

It explains the Protocol Tooling interaction model to a passive viewer. The viewer does not participate in the conversation.

The live WebMCP-enabled business surface remains at `/businesses/{slug}` (for example `/businesses/acme-hvac`). That page is where compatible agents prove real access to exposed capabilities.

| Surface | Role |
| --- | --- |
| `/demo` | Explain the product with a controlled walkthrough |
| `/businesses/{slug}` | Prove real WebMCP agent integration |

## Experience

`/demo` presents two persistent primary surfaces:

- **Left:** a believable, dated small-business website (human surface — full height)
- **Right:** the customer's modern personal AI agent (native shadcn chat, playback only)

Normally, the website looks like an ordinary dated HVAC business site. When the customer's agent needs business truth:

```text
RIGHT CHAT
    ↓
agent cursor appears
    ↓
travels across whitespace to LEFT WEBSITE
    ↓
website softly dims / blurs / recedes into agent-access state
    ↓
centered agent interaction overlay appears
    ↓
real operations execute visually (human-readable primary, subordinate tool identifier)
    ↓
real result resolves
    ↓
overlay gracefully dismisses
    ↓
website returns to normal
    ↓
cursor travels back to chat
    ↓
agent responds in conversation
```

This makes the core product value immediately obvious:
**The human experiences an ordinary website. When the agent accesses it, the website exposes a rich, structured capability layer specifically for the agent.**

## Motion design

### External guidance reviewed

- **Apple Human Interface Guidelines (Motion & Animation):** Motion must be purposeful, fluid, and physically coherent. Physics-driven springs preserve spatial continuity and direct connection without gratuitous overshoot.
- **Material Design 3 (Motion):** Standard easing curves (decelerate/ease-out on enter, accelerate/ease-in on exit), clear shared coordinate space, container transforms, and short duration tiers (150–300ms for micro-transitions, 300–550ms for cross-surface movement).
- **Motion / Framer Motion docs:** Declarative spring orchestration (`damping`, `stiffness`, `mass`), layout-independent transforms (`scale`, `opacity`, `translate`), and unmount-safe sequencing.
- **shadcn / Radix primitives:** Restrained neutral surfaces, crisp borders, `backdrop-blur-md`, and elevated cards with clean hierarchy.
- **web.dev Animation Performance:** Hardware-accelerated properties only (`transform`, `opacity`, `will-change: transform`). Avoid full-screen expensive Gaussian blurs or layout reflows (`width`, `height`, `top`, `left`).
- **MDN Web Accessibility & `prefers-reduced-motion`:** Instantly disable spatial translation and cursor traveling when reduced motion is requested, while preserving identical functional states, timing for comprehension, and business facts.

### Selected motion principles

1. **Clear cause and effect:** Every animation explains what changed ("agent accessed website", "slot resolved", "booking confirmed").
2. **Spatial continuity:** The cursor physically bridges chat and website, grounding the viewer in where the agent went.
3. **Subtle depth and recession:** The business site recedes slightly (`blur-[1.5px] opacity-40 scale-[0.99]`) so the viewer understands the capability belongs to *this* website without obscuring it completely.
4. **Transform/opacity over layout thrashing:** Zero layout shifts during transitions; all movement uses GPU-friendly transforms.
5. **Restraint:** No bouncing for its own sake, no neon glows, no kinetic text typography, no decorative particles.

### Animation implementation choice

The application leverages `motion/react` (already installed in the repository):
- `useSpring` physics for the `AgentCursor` (calculating angle of movement, slight movement-scale contraction, and smooth deceleration).
- Declarative `motion.div` transitions for the `AgentInteractionOverlay` (ease-out entry `scale: 0.96 → 1`, exit `scale: 1 → 0.96`, opacity fades).
- Coordinated visual sequence controller in `src/demo/visual-sequence.ts` managing phases (`entering` → `operating` → `returning` → `idle`) with explicit completion promises and abort safety.

### Reduced-motion behavior

When `prefers-reduced-motion` is enabled:
- Agent cursor travel animation across panels is disabled.
- Website agent-access transition is immediate.
- Overlay enters and exits without translation/scaling springs.
- Step progression and reading hold times are preserved so the story remains fully understandable.

### Why contextual overlay replaced persistent terminal

The persistent terminal split the screen into an artificial developer console with monospace trace logs (`protocol-tooling://agent`, `> search_services`). This distracted from the product narrative.

The contextual overlay transforms the experience:
1. **Full business website:** The entire left panel is the business website.
2. **On-demand capability:** The structured layer is only revealed when the agent arrives.
3. **Human-readable first:** Primary text is conversational ("Finding the right service", "Available tomorrow"), with WebMCP tool identifiers subordinate.

## Self-driving walkthrough

After a short orientation pause (~0.5–1.2s), playback begins automatically. The viewer watches; they do not type.

A scripted simulated user feeds messages through the **same** `/api/demo/turn` interaction layer used across the app:

1. `What's happening with my AC?`
2. `Yeah.`
3. `78701`
4. `Sure.`
5. `4:30`
6. `Yes.`

Agent replies, tool activity, prices, durations, eligibility, availability, and booking confirmation are produced by the existing orchestration and domain layers — not hardcoded movie frames.

There is **no editable chat composer** on `/demo`. The right-hand panel is a transcript/playback surface.

### Grouped website visits

Cursor motion and overlay activation happen only when business capabilities are accessed:

1. **Turn 3 (After ZIP):** `search_services` + `check_service_area`
   - Overlay shows "Finding the right service" → resolves "AC Diagnostic Visit · $89 · 90 min" → "Checking service area" → resolves "Available in 78701".
2. **Turn 4 (After availability permission):** `get_availability`
   - Overlay shows "Finding available times" → resolves "Available tomorrow" with slot pills `4:00 PM`, `4:15 PM`, `4:30 PM`.
3. **Turn 6 (After booking confirmation):** `create_appointment`
   - Overlay shows "Booking appointment" → resolves "✓ Confirmed" → storefront displays "Appointment received" notice.

Purely conversational turns (guidance, consent, ZIP request, slot choice confirmation) remain in chat and do not move the cursor.

### Controls & Replay

- **Replay:** Clean reset of transcript, overlay state, appointment state, cursor, and playback. Mid-animation replay cancels pending promises and cleans up abort controllers without leaving the site blurred or cursor stranded.

## Storefront mocks

The public walkthrough uses **Acme Heating & Air**. Salon and Auto configurations remain in the codebase for architecture and tests. Operational facts (services, prices, durations, hours, service area, staff) remain configuration-driven.

## Isolation

Anonymous demo state is **ephemeral and client-held**.

- Config + appointments live in React state
- Each `/api/demo/turn` request is **stateless**
- Nothing is written to Postgres or shared server state
- Seeded businesses are never mutated
- Replay remounts the demo session and cancels pending playback work

## Architecture

```text
Scripted simulated user (walkthrough driver)
    → same /api/demo/turn interaction layer
    → DemoBookingEngine → domain search / service area / availability / booking
    → real activity[] + conversational reply
    → client visual sequence → agent-access state + contextual overlay + cursor + chat transcript
```

## Real vs representative

**Real:** services, prices, durations, eligibility, availability, scheduling, appointment creation, orchestration activity, and booking notice data.

**Representative:** scripted simulated user, self-driving playback, animated agent cursor, embedded personal-agent conversation UI, and email “would be sent”.

Production WebMCP behavior remains on `/businesses/{slug}` and is unchanged by the product demo presentation layer.
