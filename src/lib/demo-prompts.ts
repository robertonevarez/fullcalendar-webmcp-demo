/** Near-future weekday (Mon–Fri) date string YYYY-MM-DD in America/Chicago for demo prompts. */
export function nextWeekdayDate(daysAhead = 1): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const cursor = new Date();
  for (let i = 0; i < 14; i += 1) {
    cursor.setUTCDate(cursor.getUTCDate() + (i === 0 ? daysAhead : 1));
    const parts = Object.fromEntries(
      formatter.formatToParts(cursor).map((part) => [part.type, part.value]),
    );
    const iso = `${parts.year}-${parts.month}-${parts.day}`;
    const chicagoWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
    }).format(cursor);
    if (!['Sat', 'Sun'].includes(chicagoWeekday)) {
      return iso;
    }
  }

  return formatter.format(new Date());
}

export function hvacPositivePrompt(): string {
  return [
    'I need someone to look at my AC tomorrow after 4.',
    'The upstairs isn\'t cooling.',
    'I\'m in 78701.',
    'Find the right service and tell me what\'s available.',
  ].join('\n');
}

export function hvacNegativePrompt(): string {
  return 'I need an AC tune-up service. Could you check if Acme Heating & Air covers zip code 90210, look up the service details and pricing, and help me schedule if eligible?';
}

export const BUSINESS_ARCHETYPES: Record<
  string,
  { label: string; proves: string }
> = {
  'acme-hvac': {
    label: 'HVAC / field service',
    proves: 'Service area, technician capabilities, after-hours preference',
  },
  'blue-pipe-plumbing': {
    label: 'Plumbing / field service',
    proves: 'Separate postal zones and trade capabilities',
  },
  'northline-salon': {
    label: 'Salon / provider',
    proves: 'Provider-only booking without service area',
  },
  'harbor-physical-therapy': {
    label: 'Clinic / wellness',
    proves: 'Therapist + treatment room compound resources',
  },
  'mesa-auto-service': {
    label: 'Auto service',
    proves: 'Technician + service bay simultaneous allocation',
  },
};
