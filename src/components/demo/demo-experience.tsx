'use client';

import { useState } from 'react';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { cloneDemoConfig } from '@/demo/normalize';
import { getDefaultPreset } from '@/demo/presets';
import { CANONICAL_WALKTHROUGH_SCRIPT, type PlaybackState } from '@/demo/walkthrough';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

/**
 * Public product demo: one self-driving Acme walkthrough.
 * Displays only the simulated business website and customer agent conversation.
 */
export function DemoExperience() {
  const [sessionKey] = useState(0);
  const [, setPlaybackState] = useState<PlaybackState>('idle');

  const preset = getDefaultPreset();
  const config = cloneDemoConfig(preset.config);

  return (
    <div className="flex flex-col">
      <section className={cn(ds.layout.container, spacing.x, 'pt-4 pb-8 md:pb-10')}>
        <h1 className="sr-only">Product demo</h1>

        <div
          className="flex min-h-0 max-h-[80svh] flex-col md:h-[80svh]"
          aria-label="Product demo"
        >
          <CustomerConversation
            key={sessionKey}
            config={config}
            script={CANONICAL_WALKTHROUGH_SCRIPT}
            onPlaybackStateChange={setPlaybackState}
          />
        </div>
      </section>
    </div>
  );
}
