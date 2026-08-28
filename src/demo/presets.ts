import type { DemoConfig } from '@/demo/types';

export type DemoPresetId = 'acme-hvac' | 'northline-salon' | 'mesa-auto';

export interface DemoPreset {
  id: DemoPresetId;
  label: string;
  blurb: string;
  webmcpPath: string;
  config: DemoConfig;
  customerPrompt: string;
}

const ACME_CONFIG: DemoConfig = {
  archetype: 'field_service',
  businessName: 'Acme Heating & Air',
  locationLabel: 'Austin, TX',
  services: [
    {
      id: 'demo_svc_ac_diagnostic',
      name: 'AC Diagnostic Visit',
      duration_minutes: 90,
      price_dollars: 89,
    },
    {
      id: 'demo_svc_preventive',
      name: 'Preventive Maintenance',
      duration_minutes: 60,
      price_dollars: 79,
    },
  ],
  staff: ['James', 'Maria'],
  availability: {
    days: [1, 2, 3, 4, 5],
    open: '08:00',
    close: '18:00',
  },
  postalCodes: ['78701', '78702', '78703'],
  notificationEmail: 'hello@acme.example',
  timezone: 'America/Chicago',
};

const NORTHLINE_CONFIG: DemoConfig = {
  archetype: 'salon',
  businessName: 'Northline Salon',
  services: [
    {
      id: 'demo_svc_haircut',
      name: 'Haircut',
      duration_minutes: 45,
      price_dollars: 45,
    },
    {
      id: 'demo_svc_color',
      name: 'Color Service',
      duration_minutes: 120,
      price_dollars: 125,
    },
  ],
  staff: ['Sarah', 'Leo'],
  availability: {
    days: [2, 3, 4, 5, 6],
    open: '09:00',
    close: '19:00',
  },
  postalCodes: [],
  notificationEmail: 'hello@northline.example',
  timezone: 'America/Chicago',
};

const MESA_CONFIG: DemoConfig = {
  archetype: 'auto',
  businessName: 'Mesa Auto Service',
  services: [
    {
      id: 'demo_svc_oil_change',
      name: 'Oil Change',
      duration_minutes: 45,
      price_dollars: 69.99,
    },
    {
      id: 'demo_svc_brake',
      name: 'Brake Inspection',
      duration_minutes: 60,
      price_dollars: 89,
    },
  ],
  staff: ['Maria Vega', 'Tom Reed'],
  facilities: ['Service Bay 1', 'Service Bay 2'],
  availability: {
    days: [1, 2, 3, 4, 5, 6],
    open: '07:30',
    close: '18:00',
  },
  postalCodes: [],
  notificationEmail: 'hello@mesa.example',
  timezone: 'America/Chicago',
};

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'acme-hvac',
    label: 'Acme Heating & Air',
    blurb: 'Field service with a ZIP service area',
    webmcpPath: '/businesses/acme-hvac',
    config: ACME_CONFIG,
    customerPrompt: "my ac is blowing warm air, can you check what's up?",
  },
  {
    id: 'northline-salon',
    label: 'Northline Salon',
    blurb: 'Salon appointments at the business location',
    webmcpPath: '/businesses/northline-salon',
    config: NORTHLINE_CONFIG,
    customerPrompt: 'i need a haircut tomorrow morning, what times are open?',
  },
  {
    id: 'mesa-auto',
    label: 'Mesa Auto Service',
    blurb: 'Technician and service bay booked together',
    webmcpPath: '/businesses/mesa-auto-service',
    config: MESA_CONFIG,
    customerPrompt: 'i need an oil change tomorrow morning, what do you have?',
  },
];

export const DEFAULT_PRESET_ID: DemoPresetId = 'acme-hvac';

export function getDemoPreset(id: DemoPresetId): DemoPreset {
  const preset = DEMO_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown demo preset: ${id}`);
  return preset;
}

export function getDefaultPreset(): DemoPreset {
  return getDemoPreset(DEFAULT_PRESET_ID);
}
