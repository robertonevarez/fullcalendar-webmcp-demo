import type { Metadata } from 'next';
import { DemoExperience } from '@/components/demo/demo-experience';

export const metadata: Metadata = {
  title: 'Product demo',
  description:
    'See what Protocol Tooling exposes to agents beside what a customer experiences through their AI agent.',
};

export default function DemoPage() {
  return (
    <main>
      <DemoExperience />
    </main>
  );
}
