/**
 * Presentation-only event palette.
 *
 * Colors are derived from stable event IDs for visual differentiation.
 * They are not persisted, not part of CalendarEvent, and carry no domain meaning.
 */

export type EventPaletteSwatch = {
  /** Soft tinted background (maps to FullCalendar `color`). */
  color: string;
  /** Readable foreground (maps to FullCalendar `contrastColor`). */
  contrastColor: string;
  /** Slightly deeper tint for hover feedback. */
  hoverColor: string;
};

/**
 * Low-saturation enterprise tones aligned with Protocol Tooling / Blume neutrals.
 * Soft backgrounds + darker related text — not saturated blocks with white text.
 */
export const EVENT_PALETTE: readonly EventPaletteSwatch[] = [
  {
    // blue
    color: "oklch(95% 0.02 250)",
    contrastColor: "oklch(34% 0.06 250)",
    hoverColor: "oklch(92% 0.03 250)",
  },
  {
    // indigo
    color: "oklch(95% 0.025 280)",
    contrastColor: "oklch(34% 0.07 280)",
    hoverColor: "oklch(92% 0.035 280)",
  },
  {
    // violet
    color: "oklch(95% 0.025 310)",
    contrastColor: "oklch(34% 0.07 310)",
    hoverColor: "oklch(92% 0.035 310)",
  },
  {
    // emerald
    color: "oklch(95% 0.025 160)",
    contrastColor: "oklch(34% 0.055 160)",
    hoverColor: "oklch(92% 0.035 160)",
  },
  {
    // amber
    color: "oklch(95.5% 0.03 85)",
    contrastColor: "oklch(38% 0.06 70)",
    hoverColor: "oklch(92.5% 0.04 85)",
  },
  {
    // rose
    color: "oklch(95.5% 0.025 15)",
    contrastColor: "oklch(38% 0.07 15)",
    hoverColor: "oklch(92.5% 0.035 15)",
  },
] as const;

/** FNV-1a 32-bit — stable across JS engines; not cryptographic. */
export function hashEventId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function paletteIndexForEventId(id: string): number {
  return hashEventId(id) % EVENT_PALETTE.length;
}

export function paletteForEventId(id: string): EventPaletteSwatch {
  return EVENT_PALETTE[paletteIndexForEventId(id)]!;
}
