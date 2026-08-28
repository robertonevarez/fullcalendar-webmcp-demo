import type { Metadata } from 'next';
import { Page } from '@/components/layout';

export const metadata: Metadata = {
  title: 'WebMCP tools',
  description: 'Protocol Tooling WebMCP capability surface for agent-native booking.',
};

export default function DocsPage() {
  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
    </Page>
  );
}
