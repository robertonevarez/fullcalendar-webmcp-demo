'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────
 * THINKING — expandable agent trace primitive
 *
 *   Steps      step list with spinner → muted checks
 *   Reasoning  prose reasoning that expands, then settles
 *   Search     web-search trace: query + sources read
 *   Coding     tool trace: files read, edits, commands
 *
 * The trace runs once, settles, and remains expandable.
 * ───────────────────────────────────────────────────────── */

export type ThinkingStatus = 'active' | 'resolved';

const STAGES = [400, 500, 700, 900, 600];

function useSequence(steps: number[], reducedMotion = false) {
  const [stage, setStage] = useState(reducedMotion ? steps.length - 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps, reducedMotion]);
  return reducedMotion ? steps.length - 1 : stage;
}

type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};

const VARIANTS: Record<
  string,
  { active: string; done: string; rows: Row[]; query?: string }
> = {
  Steps: {
    active: 'Thinking',
    done: 'Thought for 2 seconds',
    rows: [
      { primary: 'Analyzing service request for 78701' },
      { primary: 'Discovering WebMCP providers', secondary: 'Acme HVAC' },
      { primary: 'Opening in-app browser session', secondary: 'acmehvac.com' },
      { primary: 'Querying diagnostic visit slots', secondary: '90 min' },
    ],
  },
  Reasoning: {
    active: 'Thinking',
    done: 'Thought for 2 seconds',
    rows: [
      { primary: 'Austin dispatch shows high demand for AC diagnostics in 78701.' },
      { primary: 'Opening in-app browser to inspect Acme HVAC live availability.' },
    ],
  },
  Search: {
    active: 'Searching WebMCP registry',
    done: 'Discovered Acme HVAC',
    query: 'austin hvac emergency service 78701',
    rows: [
      { primary: 'Acme Heating & Air', secondary: 'acmehvac.com', href: 'https://acmehvac.com' },
    ],
  },
  Coding: {
    active: 'Running tools',
    done: 'Ran 2 tools',
    rows: [
      { primary: 'Search', secondary: 'search_services', mono: true },
      { primary: 'Verify', secondary: 'check_service_area', mono: true },
    ],
  },
};

export function ThinkingTrace({
  variant = 'Steps',
  reducedMotion = false,
  onSettled,
  className,
}: {
  variant?: string;
  reducedMotion?: boolean;
  onSettled?: () => void;
  className?: string;
}) {
  const stage = useSequence(STAGES, reducedMotion);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const v = VARIANTS[variant] ?? VARIANTS.Steps;
  const autoExpanded = stage >= 1 && stage < 4;
  const expanded = manualExpanded ?? autoExpanded;
  const working = stage < 3 && !reducedMotion;
  const visible = stage < 2 && !reducedMotion ? 0 : stage === 2 && !reducedMotion ? Math.min(2, v.rows.length) : v.rows.length;
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visible, expanded, variant, stage]);

  /* let embedders sequence content after the trace settles */
  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [working, onSettled]);

  return (
    <div
      key={variant}
      role="status"
      aria-label="Agent thinking trace"
      className={`flex w-full max-w-95 flex-col text-sm ${className ?? ''}`}
      style={{
        minHeight: working || expanded ? 96 : undefined,
        transition: reducedMotion ? undefined : 'min-height 400ms cubic-bezier(0.23,1,0.32,1)',
      }}
    >
      {/* header — shared across variants */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))}
        className="-mx-1 flex w-fit items-center rounded px-1 py-0.5 text-left transition-colors duration-100 hover:bg-muted/40 cursor-pointer"
      >
        {working ? (
          <span
            className="bg-clip-text font-medium whitespace-nowrap text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)',
              backgroundSize: '200% 100%',
              animation: reducedMotion ? undefined : 'shimmer-text 1.4s linear infinite',
            }}
          >
            {v.active}…
          </span>
        ) : (
          <span
            className="font-medium whitespace-nowrap text-ink-2"
            style={{ animation: reducedMotion ? undefined : 'fade-in 350ms ease-out both' }}
          >
            {v.done}
          </span>
        )}
      </button>

      {/* expandable trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-400"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{
                top: -8,
                height: lineHeight ? lineHeight - 2 : 0,
                transition: reducedMotion ? undefined : 'height 500ms cubic-bezier(0.23,1,0.32,1)',
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {v.query && (
                <div
                  className="flex h-5 items-center px-1 text-ink-2"
                  style={{
                    animation: expanded && !reducedMotion ? 'fade-up 300ms cubic-bezier(0.23,1,0.32,1) both' : undefined,
                  }}
                >
                  {v.query}
                </div>
              )}
              {v.rows.slice(0, visible).map((row, i) => {
                const content = (
                  <>
                    <span className={`min-w-0 truncate ${variant === 'Reasoning' ? 'whitespace-normal leading-snug text-ink-2' : 'font-medium text-ink'}`}>
                      {row.primary}
                    </span>
                    {row.secondary && (
                      <span className={`shrink-0 text-ink-3 ${row.mono ? 'font-mono' : ''}`}>
                        {row.secondary}
                      </span>
                    )}
                    {row.add !== undefined && (
                      <span className="shrink-0 font-mono tabular-nums">
                        <span className="text-green">+{row.add}</span>{' '}
                        <span className="text-red">−{row.del}</span>
                      </span>
                    )}
                  </>
                );
                const rowClass = 'flex min-h-6 w-full items-center gap-1.5 rounded px-1 py-0.5 text-left';
                const animation = reducedMotion
                  ? undefined
                  : { animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 100}ms both` };

                if (variant === 'Search') {
                  return (
                    <a
                      key={row.primary}
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`${rowClass} transition-colors duration-150 hover:bg-muted/50`}
                      style={animation}
                    >
                      {content}
                    </a>
                  );
                }

                if (variant === 'Coding') {
                  const selected = selectedTool === row.primary;
                  return (
                    <button
                      key={row.primary}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTool(selected ? null : row.primary)}
                      className={`${rowClass} transition-colors duration-150 ${selected ? 'bg-muted' : 'hover:bg-muted/50'}`}
                      style={animation}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={row.primary} className={rowClass} style={animation}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThinkingTrace;
