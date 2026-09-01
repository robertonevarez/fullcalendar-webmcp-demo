import type {
  CalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@protocoltooling/fullcalendar";

import {
  classifyUpdate,
  type CalendarMutation,
  type MutationOrigin,
} from "./mutation-signal";

export type MutationListener = (mutation: CalendarMutation) => void;

/**
 * Wraps a repository so successful writes announce what they were.
 *
 * `onEventsChanged` is a zero-argument callback, so the calendar cannot tell a
 * create from a delete from an ordinary refresh. The repository interface can,
 * and the host owns it — decorating here keeps WebMCP unaware of presentation
 * and keeps presentation unaware of WebMCP.
 *
 * Signals are emitted only after the inner call resolves, so a failed mutation
 * can never imply success in the UI.
 */
export function withMutationSignals(
  inner: CalendarEventRepository,
  emit: MutationListener,
  origin: MutationOrigin,
): CalendarEventRepository {
  const notify = (mutation: CalendarMutation) => {
    try {
      emit(mutation);
    } catch {
      // Presentation must never break persistence.
    }
  };

  return {
    list: (query, options) => inner.list(query, options),
    get: (id, options) => inner.get(id, options),

    async create(
      input: CreateCalendarEventInput,
      options?: { signal?: AbortSignal },
    ) {
      const after = await inner.create(input, options);
      notify({ kind: "created", origin, id: after.id, after });
      return after;
    },

    async update(
      id: string,
      input: UpdateCalendarEventInput,
      options?: { signal?: AbortSignal },
    ) {
      const before = await inner.get(id, options).catch(() => null);
      const after = await inner.update(id, input, options);
      notify({ kind: classifyUpdate(before, after), origin, id, before, after });
      return after;
    },

    async delete(id: string, options?: { signal?: AbortSignal }) {
      const before = await inner.get(id, options).catch(() => null);
      await inner.delete(id, options);
      notify({ kind: "removed", origin, id, before });
    },
  };
}
