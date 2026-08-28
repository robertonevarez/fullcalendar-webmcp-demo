import type { Metadata } from 'next';
import { RootChrome } from '@/components/root-chrome';
import { instrumentSans } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Protocol Tooling — Infrastructure for the agent-native web',
    template: '%s · Protocol Tooling',
  },
  description:
    'Infrastructure for the agent-native web. This implementation exposes service-business scheduling and booking capabilities to personal AI agents through WebMCP.',
  openGraph: {
    title: 'Protocol Tooling — Infrastructure for the agent-native web',
    description:
      'Infrastructure for the agent-native web. This implementation exposes service-business scheduling and booking capabilities to personal AI agents through WebMCP.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('h-dvh font-sans overflow-hidden', instrumentSans.variable)}>
      <body className="flex h-dvh max-h-dvh flex-col overflow-hidden text-foreground antialiased selection:bg-muted">
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
