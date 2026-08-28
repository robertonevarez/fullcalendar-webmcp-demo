import type { DemoActivityStep } from '@/demo/types';

/** Plain-language agent capabilities shown on the Protocol Tooling surface. */
export const DEMO_AGENT_CAPABILITIES: Array<{
  label: string;
  tool: string;
}> = [
  { label: 'Search services', tool: 'search_services' },
  { label: 'Read service details', tool: 'get_service_details' },
  { label: 'Check service area', tool: 'check_service_area' },
  { label: 'Find availability', tool: 'get_availability' },
  { label: 'Create appointment', tool: 'create_appointment' },
  { label: 'Retrieve appointment', tool: 'get_appointment' },
  { label: 'Reschedule appointment', tool: 'reschedule_appointment' },
  { label: 'Cancel appointment', tool: 'cancel_appointment' },
];

export function mergeActivity(
  previous: DemoActivityStep[],
  next: DemoActivityStep[],
): DemoActivityStep[] {
  if (!next.length) return previous;
  return [
    ...previous,
    ...next.map((step, index) => ({
      ...step,
      id: `${previous.length + index}-${step.id}`,
    })),
  ];
}
