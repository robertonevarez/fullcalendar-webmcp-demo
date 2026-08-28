import { notFound } from 'next/navigation';
import { Page, Section } from '@/components/layout';
import { WebMCPBusinessProvider } from '@/components/webmcp-business-provider';
import { WebMCPStatus } from '@/components/webmcp-status';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
  if (!business) return { title: 'Business' };
  return {
    title: business.name,
    description: `Agent-bookable scheduling surface for ${business.name} via WebMCP.`,
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
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
