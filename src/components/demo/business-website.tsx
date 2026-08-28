'use client';

import type { ReactNode } from 'react';
import type { DemoBusinessNotice, DemoConfig, DemoPublicAppointment } from '@/demo/types';
import { BrowserToolbar, type BrowserState } from '@/components/demo/browser-toolbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
  lastBooking: DemoPublicAppointment | null;
  businessNotice: DemoBusinessNotice | null;
  isAgentAccess?: boolean;
  overlay?: ReactNode;
  browserState?: BrowserState;
  showHeader?: boolean;
  className?: string;
};

/**
 * Rich, authentic early-web local business website mockup inspired by debloat.dev,
 * framed inside an in-app personal agent browser window.
 */
export function BusinessWebsite({
  config,
  isAgentAccess = false,
  overlay,
  browserState = 'loaded',
  showHeader = true,
  className,
}: Props) {
  const isLoaded = browserState === 'loaded';
  const websiteUrl = 'https://acmehvac.com';

  return (
    <article
      id="top"
      data-demo-target="storefront"
      data-agent-access={isAgentAccess ? 'true' : 'false'}
      data-browser-state={browserState}
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-white font-system text-xs leading-snug text-[#222]',
        className,
      )}
      aria-label={`${config.businessName} website`}
    >
      {/* Top Browser Toolbar Chrome */}
      {showHeader && <BrowserToolbar url={websiteUrl} browserState={browserState} />}

      {/* Website Body with smooth ease-in and ease-out */}
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white transition-[opacity,transform] duration-700 ease-in-out',
          isLoaded
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-[0.99] pointer-events-none select-none',
        )}
      >
        <ScrollArea
          hideScrollbar
          className="min-h-0 flex-1"
          viewportClassName={cn(
            'p-2 text-xs leading-tight transition-all duration-500 ease-in-out',
            isAgentAccess && 'opacity-20 blur-[2px] scale-[0.99] pointer-events-none select-none',
          )}
        >
          <div className="pointer-events-none mx-auto w-full select-none space-y-2 pb-8">
            {/* Top Brand & Search Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ddd] pb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-black tracking-tight text-[#d32f2f]">
                acme
              </span>
              <span className="text-xs font-bold tracking-tight text-[#111]">
                hvac
              </span>
              <span className="hidden text-xs text-[#666] sm:inline">
                replace the heat — certified emergency heating &amp; air conditioning dispatch
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                readOnly
                tabIndex={-1}
                value="e.g. ac repair, 78701"
                className="w-40 rounded-none border border-[#999] px-2 py-0.5 text-xs text-[#555] outline-none"
              />
              <button
                type="button"
                tabIndex={-1}
                className="border border-[#777] bg-[#eee] px-2 py-0.5 text-xs font-bold text-[#222]"
              >
                Search
              </button>
            </div>
          </div>

          {/* Austin Heat Advisory Banner */}
          <div className="flex items-center justify-between border border-[#e65100] bg-[#fff3e0] px-2 py-1 text-xs text-[#b71c1c]">
            <div>
              <span className="font-bold">⚠️ AUSTIN HEAT ADVISORY (104°F High):</span>{' '}
              Priority dispatch active for systems blowing warm air or experiencing frozen coils.
            </div>
            <span className="hidden text-xs text-[#e65100] sm:inline">Dispatch Line: (512) 555-0199</span>
          </div>

          {/* Dual Big Banner Ads */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="border-2 border-[#0033aa] bg-[#0044cc] p-2 text-center text-white shadow-xs">
              <div className="text-xs font-black tracking-wide">
                ★ 24/7 EMERGENCY DISPATCH ★
              </div>
              <div className="text-xs opacity-90">
                call (512) 555-0199 • Austin, Round Rock, Cedar Park &amp; Travis County
              </div>
            </div>
            <div className="border-2 border-[#006611] bg-[#008822] p-2 text-center text-white shadow-xs">
              <div className="text-xs font-black tracking-wide">
                ★ $20 OFF FIRST DIAGNOSTIC VISIT ★
              </div>
              <div className="text-xs opacity-90">
                flat-rate pricing • certified technicians • Texas License #TACLA019284E
              </div>
            </div>
          </div>

          {/* Solid Blue Navbar */}
          <nav className="flex items-center justify-between bg-[#003399] px-3 py-1 text-xs font-bold text-white">
            <div className="flex flex-wrap gap-x-3.5 gap-y-1">
              <span className="cursor-pointer underline">home</span>
              <span className="cursor-pointer underline">services (18)</span>
              <span className="cursor-pointer underline">pricing guide</span>
              <span className="cursor-pointer underline">service area</span>
              <span className="cursor-pointer underline">technicians</span>
              <span className="cursor-pointer underline">energy rebates</span>
              <span className="cursor-pointer underline">customer reviews</span>
              <span className="cursor-pointer underline">contact dispatch</span>
            </div>
            <span className="cursor-pointer underline">tech portal login</span>
          </nav>

          {/* Main 3-Column Layout */}
          <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-[9.5rem_1fr_10.5rem]">
            {/* Left Sidebar: Categories & Badges */}
            <aside className="space-y-2">
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-xs font-bold text-black">
                  Service Categories
                </div>
                <ul className="space-y-1 p-2 text-xs text-[#0033cc]">
                  <li className="underline">AC Diagnostics <span className="text-[#666]">(14)</span></li>
                  <li className="underline">Heating &amp; Furnaces <span className="text-[#666]">(8)</span></li>
                  <li className="underline">Seasonal Tune-Ups <span className="text-[#666]">(6)</span></li>
                  <li className="underline">Compressor Rebuilds <span className="text-[#666]">(5)</span></li>
                  <li className="underline">Refrigerant Leak Test <span className="text-[#666]">(7)</span></li>
                  <li className="underline">Capacitor Replacement <span className="text-[#666]">(12)</span></li>
                  <li className="underline">Duct Flow Balancing <span className="text-[#666]">(9)</span></li>
                  <li className="underline">Thermostats &amp; Smart <span className="text-[#666]">(4)</span></li>
                  <li className="underline">Commercial Package Units <span className="text-[#666]">(7)</span></li>
                  <li className="underline">Indoor Air Quality <span className="text-[#666]">(5)</span></li>
                </ul>
              </div>

              {/* Service Certifications Box */}
              <div className="border border-[#ddd] bg-[#fbfbfb] p-2 text-xs space-y-1.5">
                <div className="font-bold text-[#111] border-b border-[#eee] pb-1">Certifications &amp; License</div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#0033aa]">[EPA-608]</span>
                  <span>Universal Refrigerant</span>
                </div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#008822]">[NATE]</span>
                  <span>Certified Pro Techs</span>
                </div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#b8860b]">[TACLA]</span>
                  <span>#019284E Master HVAC</span>
                </div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#d32f2f]">[BBB]</span>
                  <span>A+ Accredited Business</span>
                </div>
              </div>

              {/* Brand Support Box */}
              <div className="border border-[#ddd] bg-[#fbfbfb] p-2 text-xs space-y-1">
                <div className="font-bold text-[#111] border-b border-[#eee] pb-1">Brands Serviced</div>
                <div className="text-xs text-[#555] leading-relaxed">
                  Carrier • Trane • Lennox • Rheem • Goodman • York • Daikin • Ruud • American Standard
                </div>
              </div>

              {/* Technician On Duty Photo Mock */}
              <div className="border border-[#ddd] p-2 bg-[#fdfdfd] space-y-1.5">
                <div className="font-bold text-xs text-[#222]">On-Call Dispatch Crew</div>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-xs border border-[#999] bg-[#e4e7eb] font-mono text-xs font-bold text-[#335588]">
                    TECH
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-bold text-[#111]">Dave H.</div>
                    <div className="text-[#666]">Lead Tech (22 yrs exp)</div>
                    <div className="text-[#2e7d32] font-semibold">● Active in 78701</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[#eee] pt-1">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-xs border border-[#999] bg-[#e4e7eb] font-mono text-xs font-bold text-[#335588]">
                    TECH
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-bold text-[#111]">Carlos R.</div>
                    <div className="text-[#666]">Truck #2 • South Austin</div>
                    <div className="text-[#2e7d32] font-semibold">● Active in 78704</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Center Content: Description + Featured Box + Listings Table + FAQs */}
            <main className="space-y-2">
              <p className="text-xs text-[#555]">
                family-owned independent hvac service company in austin since 1994. flat-rate verified pricing, certified diagnostics, and guaranteed same-day dispatch.
              </p>

              {/* Featured Card */}
              <div className="border border-[#cca300] bg-[#fffdf0]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-xs font-bold text-black">
                  ★ Featured Service
                </div>
                <div className="space-y-1.5 p-2">
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="font-bold text-[#0033cc] underline text-xs">
                      {config.services[0]?.name || 'AC Diagnostic Visit'}
                    </span>
                    <span className="border border-[#b7e1cd] bg-[#e6f4ea] px-1 font-mono text-xs font-bold text-[#137333]">
                      FLAT-RATE $89
                    </span>
                    <span className="text-xs text-[#b8860b]">★★★★★ (184 reviews)</span>
                  </div>
                  <div className="text-xs text-[#444]">
                    replaces Mystery repair fees &amp; unverified contractor hourly quotes
                  </div>
                  <p className="text-xs leading-snug text-[#555]">
                    Comprehensive on-site inspection covering compressor health, refrigerant pressure check, electrical capacitors, evaporator coils, and thermostat calibration.
                  </p>
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <span className="text-[#0033cc] underline cursor-pointer">
                      view technician diagnostic checklist »
                    </span>
                    <span className="font-semibold text-[#2e7d32]">Same-day slots available</span>
                  </div>
                </div>
              </div>

              {/* Services Listings Table (Extended Full Catalog) */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs font-bold text-[#111]">
                    All Services &amp; Flat Rates
                  </div>
                  <span className="text-xs text-[#666]">Updated daily for Travis County</span>
                </div>
                <table className="w-full border-collapse border border-[#ccc] text-xs">
                  <thead>
                    <tr className="bg-[#003399] text-left text-white">
                      <th className="p-1 font-bold">Service Description</th>
                      <th className="p-1 font-bold">Est. Duration</th>
                      <th className="p-1 font-bold">Standard Rate</th>
                      <th className="p-1 font-bold">Rating</th>
                      <th className="p-1 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.services.map((svc) => (
                      <tr key={svc.id} className="border-b border-[#ddd] odd:bg-white even:bg-[#f9f9f9]">
                        <td className="p-1 font-bold text-[#0033cc] underline">
                          {svc.name}
                        </td>
                        <td className="p-1 text-[#555]">
                          ~{svc.duration_minutes} mins
                        </td>
                        <td className="p-1 font-mono font-bold text-[#2e7d32]">
                          ${svc.price_dollars.toFixed(2)}
                        </td>
                        <td className="p-1 text-[#b8860b]">
                          ★★★★★
                        </td>
                        <td className="p-1 text-right text-[#0033cc] underline">
                          Bookable
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b border-[#ddd] bg-white">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Emergency Coil &amp; Capacitor Repair
                      </td>
                      <td className="p-1 text-[#555]">~60 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$149.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★★</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-[#f9f9f9]">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Refrigerant Pressure Audit &amp; Leak Test
                      </td>
                      <td className="p-1 text-[#555]">~60 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$139.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★☆</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-white">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Condenser Fan Motor Replacement
                      </td>
                      <td className="p-1 text-[#555]">~75 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$189.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★★</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-[#f9f9f9]">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Blower Motor Diagnostics &amp; Electrical Check
                      </td>
                      <td className="p-1 text-[#555]">~60 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$119.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★☆</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-white">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Smart Thermostat Installation &amp; Setup
                      </td>
                      <td className="p-1 text-[#555]">~45 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$69.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★★</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-[#f9f9f9]">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Air Duct Flow &amp; Filter Balancing
                      </td>
                      <td className="p-1 text-[#555]">~45 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$49.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★★</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-white">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Evaporator Coil Chemical Deep Clean
                      </td>
                      <td className="p-1 text-[#555]">~90 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$169.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★★</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-[#f9f9f9]">
                      <td className="p-1 font-bold text-[#0033cc] underline">
                        Commercial Rooftop Unit Package Inspection
                      </td>
                      <td className="p-1 text-[#555]">~120 mins</td>
                      <td className="p-1 font-mono font-bold text-[#2e7d32]">$249.00</td>
                      <td className="p-1 text-[#b8860b]">★★★★★</td>
                      <td className="p-1 text-right text-[#0033cc] underline">Priority</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Troubleshooting FAQs Box */}
              <div className="border border-[#ddd] p-3 bg-[#fdfdfd] space-y-2">
                <div className="font-bold text-xs text-[#111] border-b border-[#eee] pb-1">
                  Common AC Troubleshooting FAQs
                </div>
                <div className="space-y-1.5 text-xs text-[#444]">
                  <div>
                    <strong className="text-[#0033cc]">Q: Why is my AC running but blowing warm air?</strong>
                    <p className="text-xs text-[#666] mt-0.5">
                      A: Most frequently caused by a blown dual-run capacitor preventing the outdoor compressor from engaging, frozen coils due to a clogged air filter, or an R-410A refrigerant pressure drop. Our $89 diagnostic checks all three.
                    </p>
                  </div>
                  <div>
                    <strong className="text-[#0033cc]">Q: Are your diagnostic and repair rates flat-rate?</strong>
                    <p className="text-xs text-[#666] mt-0.5">
                      A: Yes. All prices listed on this site are firm and upfront. We never charge travel surcharge fees within our active Travis County service ZIP codes.
                    </p>
                  </div>
                  <div>
                    <strong className="text-[#0033cc]">Q: How quickly can a technician reach 78701?</strong>
                    <p className="text-xs text-[#666] mt-0.5">
                      A: Standard same-day dispatch window is within 60–90 minutes for Downtown and Central Austin.
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Testimonials Box */}
              <div className="border border-[#ddd] p-2 bg-[#fcfcfc] space-y-1.5">
                <div className="font-bold text-xs text-[#111]">Recent Customer Reviews</div>
                <div className="space-y-1 text-xs text-[#444]">
                  <p className="border-l-2 border-[#b8860b] pl-2 italic">
                    &ldquo;AC was blowing hot air on a 102-degree afternoon. Dave arrived within an hour and replaced the capacitor. Great flat-rate price.&rdquo;
                    <span className="block text-[#777] not-italic">— Sarah M., Austin 78704 (Aug 2026)</span>
                  </p>
                  <p className="border-l-2 border-[#b8860b] pl-2 italic">
                    &ldquo;Honest diagnostic. Did not try to sell me a whole new unit like the big franchise companies did.&rdquo;
                    <span className="block text-[#777] not-italic">— Marcus R., Austin 78701 (Jul 2026)</span>
                  </p>
                  <p className="border-l-2 border-[#b8860b] pl-2 italic">
                    &ldquo;Booked a seasonal tune-up. Technician showed up right on time, washed the coils, and cleared the condensate line.&rdquo;
                    <span className="block text-[#777] not-italic">— Elena V., Austin 78751 (May 2026)</span>
                  </p>
                </div>
              </div>
            </main>

            {/* Right Sidebar: Wanted / Service Area / Stats / Guarantee */}
            <aside className="space-y-2.5">
              {/* Service Area block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-xs font-bold text-black">
                  Service Area (Travis Co.)
                </div>
                <div className="space-y-1.5 p-2 text-xs text-[#444]">
                  <p className="font-semibold text-[#111]">Coverage Neighborhoods:</p>
                  <ul className="text-xs text-[#555] space-y-0.5 leading-tight">
                    <li>• Downtown Austin (78701)</li>
                    <li>• East Austin (78702)</li>
                    <li>• Westlake / Clarksville (78703)</li>
                    <li>• South Lamar &amp; SoCo (78704)</li>
                    <li>• UT Campus &amp; Hyde Park (78705, 78751)</li>
                    <li>• South Congress &amp; Manchaca (78745)</li>
                    <li>• North Austin &amp; Domain (78758, 78759)</li>
                  </ul>
                  <div className="flex gap-1 pt-1 border-t border-[#eee]">
                    <input
                      readOnly
                      tabIndex={-1}
                      value="78701"
                      className="w-full border border-[#aaa] px-1 py-0.5 text-xs"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="border border-[#888] bg-[#eee] px-1.5 text-xs font-bold"
                    >
                      Check
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Dispatch Stats block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-xs font-bold text-black">
                  Live Dispatch Status
                </div>
                <div className="space-y-1 p-2 text-xs text-[#333]">
                  <div><strong className="text-xs text-[#111]">3</strong> active trucks</div>
                  <div><strong className="text-xs text-[#111]">184</strong> jobs this month</div>
                  <div><strong className="text-xs text-[#111]">4.9★</strong> average rating</div>
                  <div className="text-xs text-[#2e7d32] font-semibold pt-0.5">● Open for immediate booking</div>
                </div>
              </div>

              {/* Wanted / Dispatch requests */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-xs font-bold text-black">
                  Dispatch Requests
                </div>
                <ul className="space-y-1 p-2 text-xs text-[#0033cc]">
                  <li className="underline">• 78701: AC blowing warm air</li>
                  <li className="underline">• 78704: Dual-run capacitor</li>
                  <li className="underline">• 78751: Frozen evaporator coil</li>
                  <li className="underline">• 78745: Seasonal tune-up</li>
                </ul>
                <div className="border-t border-[#eee] px-2 py-0.5 text-xs text-[#0033cc] underline">
                  view all live requests »
                </div>
              </div>

              {/* Austin Energy Rebate Banner */}
              <div className="border border-[#006611] bg-[#e8f5e9] p-2 text-xs text-[#1b5e20] space-y-0.5">
                <div className="font-bold">⚡ Austin Energy Rebates</div>
                <p className="text-xs leading-tight">
                  Save up to $800 on qualifying heat pump &amp; high-efficiency system replacements.
                </p>
              </div>

              {/* 100% Guarantee Badge */}
              <div className="border border-[#b8860b] bg-[#fffdf0] p-2 text-xs text-center space-y-0.5">
                <div className="font-bold text-[#8b0000]">100% Satisfaction Guarantee</div>
                <p className="text-xs text-[#666]">All diagnostic parts &amp; labor warrantied for 1 full year.</p>
              </div>
            </aside>
          </div>

          {/* Full Web Footer */}
          <footer className="border-t border-[#ccc] pt-3 text-center text-xs text-[#666] space-y-1">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[#0033cc]">
              <span className="underline">About Acme HVAC</span>
              <span>•</span>
              <span className="underline">Warranty Terms &amp; Conditions</span>
              <span>•</span>
              <span className="underline">Emergency Guidelines</span>
              <span>•</span>
              <span className="underline">Technician Licensing</span>
              <span>•</span>
              <span className="underline">Travis County Dispatch Hub</span>
              <span>•</span>
              <span className="underline">Site Map</span>
            </div>
            <p>© 1994–2026 {config.businessName} Company. 4802 S Congress Ave, Austin, TX 78745 • Texas License #TACLA019284E • Dispatch: (512) 555-0199</p>
          </footer>
        </div>
      </ScrollArea>
      </div>

      {/* Floating Agent Capability Overlay */}
      {overlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-[2px] bg-white/30 transition-all duration-300"
          data-demo-target="overlay-container"
        >
          {overlay}
        </div>
      ) : null}
    </article>
  );
}

