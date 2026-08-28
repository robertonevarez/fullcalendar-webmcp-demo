import { WorkingHours } from '@/domain/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  });
  const parts = formatter.formatToParts(probe);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = offsetPart.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  let offsetMinutes = 0;
  if (match) {
    const sign = match[1].startsWith('-') ? -1 : 1;
    const hours = Math.abs(Number(match[1]));
    const mins = Number(match[2] ?? '0');
    offsetMinutes = sign * (hours * 60 + mins);
  }
  const [hour, minute] = timeStr.split(':').map(Number);
  const utcMs =
    Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
      hour,
      minute,
    ) - offsetMinutes * 60_000;
  return new Date(utcMs);
}

export function utcToIso(date: Date): string {
  return date.toISOString();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function weekdayInZone(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

export function timeStringInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function isWithinWorkingHours(
  start: Date,
  end: Date,
  hours: WorkingHours[],
  timeZone: string,
): boolean {
  const day = weekdayInZone(start, timeZone);
  const rule = hours.find((h) => h.day === day);
  if (!rule) return false;
  const open = zonedDateTimeToUtc(formatDateInZone(start, timeZone), rule.open, timeZone);
  const close = zonedDateTimeToUtc(formatDateInZone(start, timeZone), rule.close, timeZone);
  return start >= open && end <= close;
}

export function eachDayInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  let cursor = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return days;
}

export function matchesTimePreference(
  start: Date,
  end: Date,
  preference: string | undefined,
  timeZone: string,
): boolean {
  if (!preference) return true;
  const normalized = preference.toLowerCase();
  const startMinutes = minutesFromMidnight(start, timeZone);
  const endMinutes = minutesFromMidnight(end, timeZone);

  if (normalized.includes('morning')) {
    return startMinutes >= 8 * 60 && endMinutes <= 12 * 60;
  }
  if (normalized.includes('afternoon')) {
    return startMinutes >= 12 * 60 && endMinutes <= 17 * 60;
  }
  const afterMatch = normalized.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (afterMatch) {
    let hour = Number(afterMatch[1]);
    const minute = Number(afterMatch[2] ?? '0');
    const meridiem = afterMatch[3];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return startMinutes >= hour * 60 + minute;
  }
  const beforeMatch = normalized.match(/before\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (beforeMatch) {
    let hour = Number(beforeMatch[1]);
    const minute = Number(beforeMatch[2] ?? '0');
    const meridiem = beforeMatch[3];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return endMinutes <= hour * 60 + minute;
  }
  return true;
}

function minutesFromMidnight(date: Date, timeZone: string): number {
  const [hour, minute] = timeStringInZone(date, timeZone).split(':').map(Number);
  return hour * 60 + minute;
}
