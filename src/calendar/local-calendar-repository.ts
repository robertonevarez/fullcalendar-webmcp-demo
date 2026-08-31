import type {
  CalendarEvent,
  CalendarEventQuery,
  CalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@protocoltooling/fullcalendar";

const STORAGE_KEY = "protocoltooling-demo:calendar-events:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type RepositoryOptions = {
  storage?: StorageLike;
  storageKey?: string;
  seedEvents?: CalendarEvent[];
  createId?: () => string;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertActive(signal?: AbortSignal) {
  signal?.throwIfAborted();
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeInstant(value: string, allDay: boolean): string {
  if (allDay && isDateOnly(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error("Event start and end must be valid ISO 8601 values.");
  }

  return allDay ? date.toISOString().slice(0, 10) : date.toISOString();
}

function normalizeEvent(
  id: string,
  input: CreateCalendarEventInput,
): CalendarEvent {
  if (!input.title.trim()) {
    throw new Error("Event title cannot be empty.");
  }

  const allDay = input.allDay ?? false;
  const start = normalizeInstant(input.start, allDay);
  const end =
    input.end == null || input.end === ""
      ? null
      : normalizeInstant(input.end, allDay);

  if (end) {
    const startMs = new Date(start).valueOf();
    const endMs = new Date(end).valueOf();
    if (endMs <= startMs) {
      throw new Error("Event end must be after its start.");
    }
  }

  return {
    id,
    title: input.title.trim(),
    start,
    end,
    allDay,
  };
}

/**
 * Smallest browser-local CalendarEventRepository for the demo host.
 * localStorage is authoritative for both human and agent mutations.
 */
export class LocalCalendarEventRepository implements CalendarEventRepository {
  private readonly storageOverride: StorageLike | undefined;
  private readonly storageKey: string;
  private readonly seedEvents: CalendarEvent[];
  private readonly createId: () => string;
  private memoryFallback: CalendarEvent[] | null = null;

  constructor(options: RepositoryOptions = {}) {
    this.storageOverride = options.storage;
    this.storageKey = options.storageKey ?? STORAGE_KEY;
    this.seedEvents = clone(options.seedEvents ?? []);
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }

  async list(
    query: CalendarEventQuery = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent[]> {
    assertActive(options.signal);
    const start = query.start ? new Date(query.start) : null;
    const end = query.end ? new Date(query.end) : null;
    const text = query.text?.trim().toLocaleLowerCase();

    const events = this.read().filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = event.end ? new Date(event.end) : eventStart;
      const overlapsStart =
        !start || (event.end ? eventEnd > start : eventStart >= start);
      const overlapsEnd = !end || eventStart < end;
      const matchesText =
        !text || event.title.toLocaleLowerCase().includes(text);
      return overlapsStart && overlapsEnd && matchesText;
    });

    assertActive(options.signal);
    return clone(events);
  }

  async get(
    id: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent | null> {
    assertActive(options.signal);
    const event = this.read().find((candidate) => candidate.id === id) ?? null;
    return clone(event);
  }

  async create(
    input: CreateCalendarEventInput,
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent> {
    assertActive(options.signal);
    const event = normalizeEvent(this.createId(), input);
    this.write([...this.read(), event]);
    return clone(event);
  }

  async update(
    id: string,
    input: UpdateCalendarEventInput,
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent> {
    assertActive(options.signal);
    const events = this.read();
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) {
      throw new Error(`Event ${id} was not found.`);
    }

    const current = events[index]!;
    const updated = normalizeEvent(id, {
      title: input.title ?? current.title,
      start: input.start ?? current.start,
      end: input.end === undefined ? current.end : input.end,
      allDay: input.allDay ?? current.allDay,
    });
    events[index] = updated;
    this.write(events);
    return clone(updated);
  }

  async delete(
    id: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    assertActive(options.signal);
    const events = this.read();
    const remaining = events.filter((event) => event.id !== id);
    if (remaining.length === events.length) {
      throw new Error(`Event ${id} was not found.`);
    }
    this.write(remaining);
  }

  private storage(): StorageLike | null {
    if (this.storageOverride) return this.storageOverride;
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private read(): CalendarEvent[] {
    if (this.memoryFallback) return clone(this.memoryFallback);

    const storage = this.storage();
    if (!storage) {
      this.memoryFallback = clone(this.seedEvents);
      return clone(this.memoryFallback);
    }

    try {
      const stored = storage.getItem(this.storageKey);
      if (stored) return JSON.parse(stored) as CalendarEvent[];
      this.write(this.seedEvents);
      return clone(this.seedEvents);
    } catch {
      this.memoryFallback = clone(this.seedEvents);
      return clone(this.memoryFallback);
    }
  }

  private write(events: CalendarEvent[]) {
    const value = clone(events);
    const storage = this.storage();
    if (!storage) {
      this.memoryFallback = value;
      return;
    }

    try {
      storage.setItem(this.storageKey, JSON.stringify(value));
      this.memoryFallback = null;
    } catch {
      this.memoryFallback = value;
    }
  }
}
