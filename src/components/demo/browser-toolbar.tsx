'use client';

import { cn } from '@/lib/utils';

export type BrowserState = 'blank' | 'navigating' | 'loaded';

type Props = {
  url?: string;
  browserState?: BrowserState;
  className?: string;
};

export function BrowserToolbar({
  url = 'https://acmehvac.com',
  browserState = 'loaded',
  className,
}: Props) {
  const isBlank = browserState === 'blank';
  const isNavigating = browserState === 'navigating';
  const isLoaded = browserState === 'loaded';

  const displayUrl = isBlank ? 'about:blank' : url;

  return (
    <div
      className={cn(
        'relative flex h-6 select-none items-center justify-between border-b border-black/10 dark:border-white/10 bg-muted px-2 text-xs text-muted-foreground',
        className,
      )}
      role="region"
      aria-label="Browser toolbar"
    >
      {/* Window Controls - subtle & small */}
      <div className="flex items-center gap-1.5 opacity-60" aria-hidden="true">
        <span className="size-2 rounded-full bg-[#ff5f56]" />
        <span className="size-2 rounded-full bg-[#ffbd2e]" />
        <span className="size-2 rounded-full bg-[#27c93f]" />
      </div>

      {/* Address Bar - minimal, no mono, normal font */}
      <div className="flex items-center gap-1 text-xs">
        <span
          className={cn(
            'transition-colors',
            isBlank ? 'text-muted-foreground/70' : 'font-medium text-foreground/85',
          )}
        >
          {displayUrl}
        </span>

        {isLoaded && (
          <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
            <span>·</span>
            <span>WebMCP Active</span>
          </span>
        )}

        {isNavigating && (
          <span className="text-xs text-muted-foreground animate-pulse">
            · Connecting…
          </span>
        )}
      </div>

      {/* Right spacer for symmetry */}
      <div className="w-8" aria-hidden="true" />

      {/* Minimal loading line */}
      {isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/80 animate-pulse" />
      )}
    </div>
  );
}
