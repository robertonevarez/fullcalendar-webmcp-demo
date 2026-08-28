import type { Metadata } from 'next';
import { Hero } from '@/components/hero';

export const metadata: Metadata = {
  title: 'Protocol Tooling — Make your business bookable by AI agents',
  description:
    'Protocol Tooling lets people book your services through the AI they already use. Agent-native scheduling for service businesses, open source.',
  openGraph: {
    title: 'Protocol Tooling — Make your business bookable by AI agents',
    description:
      'Protocol Tooling lets people book your services through the AI they already use. Agent-native scheduling for service businesses, open source.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Hero />
    </main>
  );
}
