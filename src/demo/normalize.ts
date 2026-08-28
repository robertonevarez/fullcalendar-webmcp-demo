import { AppError, ErrorCodes } from '@/domain/errors';
import type {
  Business,
  LocationPolicy,
  Resource,
  ResourceRequirement,
  Service,
  WorkingHours,
} from '@/domain/types';
import type { DemoArchetype, DemoConfig, DemoServiceInput } from '@/demo/types';

export const DEMO_BUSINESS_ID = 'demo_biz_ephemeral';
export const DEMO_BUSINESS_SLUG = 'demo-ephemeral';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const POSTAL_RE = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NormalizedDemoBusiness {
  business: Business;
  services: Service[];
  resources: Resource[];
  postalCodesByZone: Map<string, string[]>;
  notificationEmail: string;
}

function slugifyServiceId(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return `demo_svc_${base || 'service'}_${index + 1}`;
}

function keywordsForService(name: string, archetype: DemoArchetype): string[] {
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  const extras: string[] = [];

  if (archetype === 'field_service') {
    if (tokens.some((t) => t === 'ac' || t === 'air' || t === 'hvac' || t === 'cooling')) {
      extras.push('ac', 'air', 'conditioning', 'cooling', 'hvac', 'upstairs', 'diagnostic');
    }
    if (tokens.some((t) => t.includes('maint'))) {
      extras.push('maintenance', 'tune', 'tuneup', 'preventive', 'checkup');
    }
    if (tokens.some((t) => t.includes('diagnost'))) {
      extras.push('diagnostic', 'inspect', 'look', 'check', 'broken', 'issue');
    }
  }

  if (archetype === 'salon') {
    if (tokens.some((t) => t.includes('hair') || t === 'cut')) {
      extras.push('haircut', 'trim', 'cut', 'barber', 'salon');
    }
    if (tokens.some((t) => t.includes('color'))) {
      extras.push('color', 'dye', 'highlights');
    }
  }

  if (archetype === 'auto') {
    if (tokens.some((t) => t.includes('oil'))) {
      extras.push('oil change', 'maintenance', 'lube');
    }
    if (tokens.some((t) => t.includes('brake'))) {
      extras.push('brake', 'inspection', 'safety');
    }
  }

  return Array.from(new Set([...tokens, ...extras]));
}

function serviceRequirements(input: DemoServiceInput, archetype: DemoArchetype): ResourceRequirement[] {
  const name = input.name.toLowerCase();
  if (archetype === 'auto') {
    const capability = name.includes('brake') ? 'brake_service' : 'oil_change';
    return [
      { resource_type: 'automotive_technician', quantity: 1, capability },
      { resource_type: 'service_bay', quantity: 1 },
    ];
  }
  if (archetype === 'salon') {
    const capability = name.includes('color') ? 'hair_color' : 'haircut';
    return [{ resource_type: 'stylist', quantity: 1, capability }];
  }
  return [{ resource_type: 'staff', quantity: 1, capability: 'demo_capable' }];
}

function normalizeService(
  input: DemoServiceInput,
  index: number,
  archetype: DemoArchetype,
  locationPolicy: LocationPolicy,
  serviceAreaRequired: boolean,
): Service {
  const id = input.id?.trim() || slugifyServiceId(input.name, index);
  const duration = Math.round(Number(input.duration_minutes));
  const dollars = Number(input.price_dollars);
  if (!input.name.trim()) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Each service needs a name.', false, 'services');
  }
  if (!Number.isFinite(duration) || duration < 15 || duration > 8 * 60) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Service duration must be between 15 and 480 minutes.',
      false,
      'services',
    );
  }
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Service price must be zero or greater.', false, 'services');
  }

  return {
    id,
    business_id: DEMO_BUSINESS_ID,
    name: input.name.trim(),
    description: `${input.name.trim()} offered by this business.`,
    duration_minutes: duration,
    price_cents: Math.round(dollars * 100),
    currency: 'USD',
    keywords: keywordsForService(input.name, archetype),
    location_policy: locationPolicy,
    service_area_required: serviceAreaRequired,
    resource_requirements: serviceRequirements(input, archetype),
    intake_fields: [],
  };
}

function buildResources(
  config: DemoConfig,
  workingHours: WorkingHours[],
): Resource[] {
  const resources: Resource[] = [];

  if (config.archetype === 'auto') {
    config.staff.forEach((name, index) => {
      resources.push({
        id: `demo_res_tech_${index + 1}`,
        business_id: DEMO_BUSINESS_ID,
        name: name.trim(),
        resource_type: 'automotive_technician',
        capabilities: ['oil_change', 'brake_service'],
        working_hours: workingHours,
        is_human: true,
      });
    });
    (config.facilities ?? []).forEach((name, index) => {
      resources.push({
        id: `demo_res_bay_${index + 1}`,
        business_id: DEMO_BUSINESS_ID,
        name: name.trim(),
        resource_type: 'service_bay',
        capabilities: [],
        working_hours: workingHours,
        is_human: false,
      });
    });
    return resources;
  }

  if (config.archetype === 'salon') {
    config.staff.forEach((name, index) => {
      const caps = index === 0 ? ['haircut', 'hair_color'] : ['haircut'];
      resources.push({
        id: `demo_res_stylist_${index + 1}`,
        business_id: DEMO_BUSINESS_ID,
        name: name.trim(),
        resource_type: 'stylist',
        capabilities: caps,
        working_hours: workingHours,
        is_human: true,
      });
    });
    return resources;
  }

  config.staff.forEach((name, index) => {
    resources.push({
      id: `demo_res_${index + 1}`,
      business_id: DEMO_BUSINESS_ID,
      name: name.trim(),
      resource_type: 'staff',
      capabilities: ['demo_capable'],
      working_hours: workingHours,
      is_human: true,
    });
  });
  return resources;
}

/**
 * Convert preset demo config into Protocol Tooling domain objects.
 * Does not touch Postgres or seeded businesses.
 */
export function normalizeDemoConfig(config: DemoConfig): NormalizedDemoBusiness {
  const businessName = config.businessName?.trim();
  if (!businessName) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Business name is required.', false, 'businessName');
  }
  if (!config.services?.length) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Add at least one service.', false, 'services');
  }
  if (!config.staff?.length || config.staff.every((s) => !s.trim())) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Add at least one staff member.', false, 'staff');
  }
  if (!config.availability?.days?.length) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Choose at least one available day.', false, 'availability');
  }
  if (!TIME_RE.test(config.availability.open) || !TIME_RE.test(config.availability.close)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Open and close times must use HH:mm.', false, 'availability');
  }
  if (config.availability.open >= config.availability.close) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Close time must be after open time.', false, 'availability');
  }

  const postalCodes = (config.postalCodes ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  for (const code of postalCodes) {
    if (!POSTAL_RE.test(code)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Postal code "${code}" must be a 5-digit US ZIP.`,
        false,
        'postalCodes',
      );
    }
  }

  const notificationEmail = config.notificationEmail?.trim() ?? '';
  if (!notificationEmail || !EMAIL_RE.test(notificationEmail)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Enter a valid notification email.',
      false,
      'notificationEmail',
    );
  }

  const timezone = config.timezone?.trim() || 'America/Chicago';
  const workingHours: WorkingHours[] = config.availability.days.map((day) => ({
    day,
    open: config.availability.open,
    close: config.availability.close,
  }));

  const serviceAreaRequired = config.archetype === 'field_service' && postalCodes.length > 0;
  const locationPolicy: LocationPolicy =
    config.archetype === 'field_service' && postalCodes.length > 0 ? 'CUSTOMER' : 'NONE';

  const business: Business = {
    id: DEMO_BUSINESS_ID,
    slug: DEMO_BUSINESS_SLUG,
    name: businessName,
    timezone,
    location_mode: serviceAreaRequired ? 'CUSTOMER_LOCATION' : 'BUSINESS_LOCATION',
    working_hours: workingHours,
    address: {
      line1: 'Demo business address',
      city: 'Austin',
      region: 'TX',
      postal_code: postalCodes[0] ?? '78756',
    },
  };

  const services = config.services.map((svc, index) =>
    normalizeService(svc, index, config.archetype, locationPolicy, serviceAreaRequired),
  );

  const resources = buildResources(config, workingHours);

  const postalCodesByZone = new Map<string, string[]>();
  if (postalCodes.length) {
    postalCodesByZone.set('demo-service-area', postalCodes);
  }

  return {
    business,
    services,
    resources,
    postalCodesByZone,
    notificationEmail,
  };
}

/** Clone preset config so mutations never affect shared constants. */
export function cloneDemoConfig(config: DemoConfig): DemoConfig {
  return structuredClone(config);
}
