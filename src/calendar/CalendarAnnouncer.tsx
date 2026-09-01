"use client";

/**
 * Polite live region for agent-driven mutations.
 *
 * Motion is never the only signal that something changed: every agent mutation
 * is also spoken here, regardless of the user's motion preference.
 */
export function CalendarAnnouncer({ message }: { message: string }) {
  return (
    <div
      className="pt-visually-hidden"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="calendar-announcer"
    >
      {message}
    </div>
  );
}
