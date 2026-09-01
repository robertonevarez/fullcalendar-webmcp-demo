# Phase D5 — agent mutation feedback

Motion and announcement layer that makes WebMCP-driven calendar mutations
legible: what changed, where it went, and that it was an operation rather than a
render.

## Architecture

Two independent layers, so the meaning never depends on the motion.

**Layer A — spatial continuity** (`event-motion.ts`). Web Animations over the
real event elements. A reschedule is a FLIP: measure before the commit, measure
after FullCalendar settles, then animate the element from its old offset back to
zero. Creations play a 180ms entrance, removals a 140ms exit before the commit
removes them, and neighbours in the affected day cells slide instead of jumping.

**Layer B — emphasis and speech** (`mutation-marks.ts`, `CalendarAnnouncer`).
A `data-pt-mutation` attribute drives a brief inset ring in the event's own ink,
and every agent mutation is spoken through a polite live region. This layer runs
even when Layer A is skipped.

## The emphasis pulse

The ring beats three times at 520ms, each beat a sharp attack and a long decay
so it reads like a blink rather than a breath. Three is the point where it still
reads as *something just happened here*; past that it starts to read as a state
the event is permanently in, and by five it reads as an alert. Both numbers are
tokens (`--pt-emphasis-pulses`, `--pt-emphasis-pulse`) if a demo needs to be
louder.

Only the ring pulses. Pulsing the event's fill or its opacity would strobe the
label and make it unreadable for the ~1.6s the treatment lasts.

Under `prefers-reduced-motion` the repeat is what goes, not the ring: one hold
and fade says the same thing once. A pulse that keeps returning is a demand for
attention, which is the part that preference is asking to be spared.

### The ring animates opacity, not colour

This looks like it should work and does not:

```css
@keyframes ring {
  from { box-shadow: inset 0 0 0 1.5px color-mix(in oklab, currentColor 50%, transparent); }
  to   { box-shadow: inset 0 0 0 1.5px transparent; }
}
```

Chrome cannot interpolate a `color-mix()` containing `currentColor` against
`transparent`, so it falls back to *discrete* interpolation — the value flips at
the midpoint. Sampling the computed `box-shadow` every frame returns exactly two
values, `0.5` and `0`, and never anything between. The ring snaps rather than
fades, which was invisible as a bug while it was a single fade and became
obvious the moment it repeated.

The ring therefore lives on a `::after` pseudo-element with a static
`box-shadow`, and only its `opacity` animates. That interpolates reliably, stays
on the compositor, and is why `[data-pt-mutation]` also sets `position:
relative` — month-view event elements are statically positioned.

The semantics come from `observable-repository.ts`, which decorates the
repository so a successful write reports *what it was*. WebMCP's
`onEventsChanged` is a zero-argument callback and cannot distinguish a create
from a delete; the repository interface can, and the host owns it.
`CalendarMutationBus` queues those signals until the matching refresh consumes
them, tagged `agent` or `human`.

## Why not the View Transitions API

The first implementation used view transitions, and it could not animate a
reschedule. FullCalendar's dayGrid positions a moved or created event in a
`requestAnimationFrame` pass and leaves it `visibility: hidden` until then, but
rendering — including rAF — is suspended inside a view transition's update
callback. The element is still hidden when the browser captures the new state,
so it receives no `::view-transition-new` snapshot and the move degrades to a
fade-out at the source with the event simply appearing at its destination.

Measured in Chrome 152 (`visibility` and `top` of a moved event, per frame):

```
raf0   vis=hidden   top=531   (positioned, not yet revealed)
raf1   vis=visible  top=571   (revealed, final position)
```

Animating the live elements avoids this entirely, and brings two further
benefits: motion is clipped by the calendar frame instead of escaping into the
top layer, and Web Animations works in every browser rather than being a
progressive enhancement.

## Crossing the edge of the view

Every view draws a fixed range, and Month draws more than its name suggests: 42
`data-date` day cells, so late August and the first ten days of October are on
screen alongside September. Week draws 7, Day draws 1. A mutation is only a
*move* if both ends of it are inside that range; otherwise it is an arrival or a
departure, and animating it as a slide would be a lie about where the event went.

`isDayVisible` answers this with a single query for the destination's day cell,
which works the same in all three views and needs no FullCalendar API.

| Situation | Treatment |
| --- | --- |
| Both ends in range | FLIP between the two cells |
| Arrives from outside the range | 180ms entrance, no origin implied |
| Leaves the range | 140ms exit at the source, then neighbours close the gap |

The departure has to be decided *before* the commit. Afterwards there is no
element left to animate, which is why a move to another month used to vanish on
a single frame with no feedback at all.

A departure and a deletion are the same event spatially — something left — so
the exit adds an 8px drift in the direction the event travelled through time,
downward for later and upward for earlier. A deletion does not drift. Alongside
the live region, which says *"moved to Tuesday, October 20"* rather than
*"removed"*, that is what separates "it is gone" from "it is elsewhere". The
emphasis mark travels with the event, so navigating to October finds it ringed.

One case stays unhandled by design: in Week or Day view an event moved to an
hour outside the scrolled time viewport is in range but off screen, and is only
discovered after the commit. It commits silently and keeps its mark. Predicting
it would mean reproducing FullCalendar's time-to-offset math.

## Gates

Spatial motion is skipped — emphasis and speech still run — when any of these
hold:

| Gate | Reason |
| --- | --- |
| `prefers-reduced-motion` | No animation is created at all, rather than neutralized |
| Document hidden | Nothing to see; avoids a burst on tab focus |
| Rename with no time change | Nothing moved, so motion would be decorative |
| Multi-day event | Renders as several segments, not one measurable box |
| Queue depth > 3 | A bulk edit stays calm |
| Destination outside the frame | The calendar never scrolls or jumps to chase a mutation |
| Travel exceeds the frame height | A long slide reads as flying; plays the entrance instead |

An off-screen mutation keeps its mark for 8 seconds, so it plays its treatment
when the user navigates to it.

## Visual QA assets

Mid-flight stills were captured with the CDP `Animation.setPlaybackRate` slowed
to 0.06 so a sub-300ms animation is visible in a screenshot.

- `d5-01-baseline.png` — September 2026 Month view, no pending mutations
- `d5-02-create-midflight.png` / `d5-03-create-settled-emphasis.png`
- `d5-04-reschedule-midflight.png` — one element in transit between Sep 2 and
  Sep 24, with no ghost left at the source
- `d5-05-reschedule-settled-emphasis.png` — settled below its new neighbour,
  ring still showing
- `d5-06-delete-midflight.png` / `d5-07-delete-settled.png`
- `d5-08-week-baseline.png` — Week view before the mutation
- `d5-09-week-reschedule-midflight.png` / `d5-10-week-settled-emphasis.png`

Crossing the range boundary (Sep 4 → Oct 20, captured at 10× duration):

- `d5-11-range-baseline.png` — Equipment Inspection above Network Audit on Sep 4
- `d5-12-range-departure-midflight.png` — mid-exit, with Network Audit still
  below it and yet to close the gap
- `d5-13-range-departure-settled.png` — Sep 4 holds Network Audit alone
- `d5-14-range-arrival-emphasis.png` — the same event found ringed on Oct 20
  after navigating a month forward

The emphasis pulse, cropped to one day cell at 3×:

- `d5-15-emphasis-pulse-crest.png` — the crest of a beat, label still legible
- `d5-16-emphasis-pulse-settled.png` — the same cell after ~1.6s, no residue
