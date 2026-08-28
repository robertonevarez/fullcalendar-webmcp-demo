import { SiteHeader } from '@/components/site-header';
import { HeroCopy } from '@/components/hero/hero-copy';
import { HeroDemoSurface } from '@/components/hero/hero-demo-surface';

export function Hero() {
  return (
    <section className="flex min-h-0 flex-1 flex-col px-4 py-4">
      <div className="container mx-auto grid min-h-0 w-full max-w-[76rem] flex-1 grid-rows-[auto_auto_minmax(0,1fr)] gap-4">
        <SiteHeader landing />
        <HeroCopy />
        <HeroDemoSurface />
      </div>
    </section>
  );
}
