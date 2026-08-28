'use client';

import { useState } from 'react';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { cloneDemoConfig } from '@/demo/normalize';
import { getDefaultPreset } from '@/demo/presets';
import { CANONICAL_WALKTHROUGH_SCRIPT } from '@/demo/walkthrough';

export function HeroDemoSurface() {
  const [sessionKey] = useState(0);
  const preset = getDefaultPreset();
  const config = cloneDemoConfig(preset.config);

  return (
    <section
      className="mt-2 min-h-0 overflow-visible sm:mt-4"
      aria-label="Product demo"
    >
      <CustomerConversation
        key={sessionKey}
        config={config}
        script={CANONICAL_WALKTHROUGH_SCRIPT}
        landing
      />
    </section>
  );
}
