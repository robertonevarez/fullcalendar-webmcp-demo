'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';

const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';
const DEMO_URL = '/demo';

const NAV_ITEMS = [
  { href: '/docs', label: 'Docs' },
  { href: GITHUB_URL, label: 'GitHub', external: true },
] as const;

type SiteHeaderProps = {
  /** Renders inside the landing hero shell — no outer container or sticky positioning. */
  embedded?: boolean;
  /** Single-line landing nav: brand on the left, links on the right. */
  landing?: boolean;
};

export function SiteHeader({ embedded = false, landing = false }: SiteHeaderProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const brand = (
    <Button variant="ghost" nativeButton={false} render={<Link href="/" />} className="tracking-tight text-lg font-semibold">
      Protocol Tooling
    </Button>
  );

  const actions = (
    <div className="flex items-center gap-4">
      {NAV_ITEMS.map((item) =>
        'external' in item ? (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a href={item.href} rel="noopener noreferrer" target="_blank" />
            }
          >
            {item.label}
          </Button>
        ) : (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={item.href} />}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            {item.label}
          </Button>
        ),
      )}

      <Button size="sm" nativeButton={false} render={<Link href={DEMO_URL} />}>
        Try demo
        <ArrowRightIcon />
      </Button>
    </div>
  );

  if (landing || embedded) {
    return (
      <header className="flex shrink-0 items-center justify-between">
        {brand}
        {actions}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container flex items-center justify-between px-4">
        {brand}
        {actions}
      </div>
    </header>
  );
}
