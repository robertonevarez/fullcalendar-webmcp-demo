import { formatDateInZone, timeStringInZone } from '@/lib/time';

export function formatPriceCents(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatSlotWhen(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const day = formatDateInZone(date, timeZone);
  const today = formatDateInZone(new Date(), timeZone);
  const tomorrow = addDaysToDateString(today, 1);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  }).format(date);

  if (day === today) return `today at ${time}`;
  if (day === tomorrow) return `tomorrow at ${time}`;
  return `${weekday} at ${time}`;
}

export function formatSlotTimeOnly(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatHoursLabel(open: string, close: string): string {
  const fmt = (hm: string) => {
    const [h, m] = hm.split(':').map(Number);
    const date = new Date(Date.UTC(2000, 0, 1, h, m));
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: m === 0 ? undefined : '2-digit',
      hour12: true,
      timeZone: 'UTC',
    }).format(date);
  };
  return `${fmt(open)} – ${fmt(close)}`;
}

export function formatDaysLabel(days: number[]): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(',') === '1,2,3,4,5') return 'Monday – Friday';
  if (sorted.join(',') === '1,2,3,4,5,6') return 'Monday – Saturday';
  if (sorted.join(',') === '2,3,4,5,6') return 'Tuesday – Saturday';
  if (sorted.join(',') === '0,1,2,3,4,5,6') return 'Every day';
  return sorted.map((d) => names[d] ?? '?').join(', ');
}

/** HH:mm in zone for matching spoken times like "4:30". */
export function slotLocalHm(iso: string, timeZone: string): string {
  return timeStringInZone(new Date(iso), timeZone);
}
