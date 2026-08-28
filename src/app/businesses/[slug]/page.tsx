import { notFound } from 'next/navigation';
import { Page, Section } from '@/components/layout';
import { WebMCPBusinessProvider } from '@/components/webmcp-business-provider';
import { WebMCPStatus } from '@/components/webmcp-status';
import { DEMO_PRESETS } from '@/demo/presets';

export const dynamic = 'force-dynamic';

const BUSINESS_LOOKUP: Record<string, { slug: string; name: string }> = {
  'acme-hvac': { slug: 'acme-hvac', name: 'Acme Heating & Air' },
  'northline-salon': { slug: 'northline-salon', name: 'Northline Salon' },
  'mesa-auto': { slug: 'mesa-auto-service', name: 'Mesa Auto Service' },
  'mesa-auto-service': { slug: 'mesa-auto-service', name: 'Mesa Auto Service' },
  'blue-pipe-plumbing': { slug: 'blue-pipe-plumbing', name: 'Blue Pipe Plumbing' },
  'harbor-physical-therapy': { slug: 'harbor-physical-therapy', name: 'Harbor Physical Therapy' },
};

function resolveBusiness(slug: string): { slug: string; name: string } | null {
  const match = BUSINESS_LOOKUP[slug];
  if (match) return match;
  const preset = DEMO_PRESETS.find((p) => p.id === slug);
  if (preset) return { slug: preset.id, name: preset.config.businessName };
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = resolveBusiness(slug);
  const name = business?.name ?? 'Business';
  return {
    title: name,
    description: `Agent-bookable scheduling surface for ${name} via WebMCP.`,
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = resolveBusiness(slug);

  if (!business) notFound();

  return (
    <WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>
      <Page>
        <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
        <p className="text-muted-foreground">Agent-ready via WebMCP</p>

        <Section className="border-t border-border pt-3">
          <h2 className="text-sm font-medium text-muted-foreground">Developer diagnostics</h2>
          <WebMCPStatus businessSlug={business.slug} businessName={business.name} />
        </Section>
      </Page>
    </WebMCPBusinessProvider>
  );
}
