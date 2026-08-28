'use client';

import { useEffect, useRef } from 'react';
import { motion, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';

const DEFAULT_SPRING = {
  damping: 45,
  stiffness: 400,
  mass: 1,
  restDelta: 0.001,
} as const;

const REDUCED_MOTION_SPRING = {
  damping: 100,
  stiffness: 1000,
  mass: 1,
  restDelta: 0.001,
} as const;

type AgentCursorProps = {
  visible: boolean;
  x: number;
  y: number;
  reducedMotion?: boolean;
  className?: string;
};

function IMessageDotCursor() {
  return (
    <div className="relative flex size-4.5 items-center justify-center">
      {/* Subtle pulse aura */}
      <span className="absolute inset-0 rounded-full bg-[#007AFF]/25 animate-ping [animation-duration:2.5s]" />
      {/* Crisp iMessage blue circle dot with white border */}
      <span className="relative size-3.5 rounded-full border-2 border-white bg-[#007AFF] shadow-[0_2px_8px_rgba(0,122,255,0.45)]" />
    </div>
  );
}

export function AgentCursor({
  visible,
  x,
  y,
  reducedMotion = false,
  className,
}: AgentCursorProps) {
  const springConfig = reducedMotion ? REDUCED_MOTION_SPRING : DEFAULT_SPRING;
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cursorX = useSpring(x, springConfig);
  const cursorY = useSpring(y, springConfig);
  const scale = useSpring(1, {
    ...springConfig,
    stiffness: reducedMotion ? 1000 : 500,
    damping: reducedMotion ? 100 : 35,
  });

  useEffect(() => {
    cursorX.set(x);
    cursorY.set(y);

    if (reducedMotion) {
      return;
    }

    scale.set(0.85);
    if (settleTimeout.current) {
      clearTimeout(settleTimeout.current);
    }
    settleTimeout.current = setTimeout(() => {
      scale.set(1);
    }, 180);
  }, [cursorX, cursorY, reducedMotion, scale, x, y]);

  useEffect(() => {
    return () => {
      if (settleTimeout.current) {
        clearTimeout(settleTimeout.current);
      }
    };
  }, []);

  return (
    <motion.div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-40 hidden md:block',
        className,
      )}
      style={{
        left: cursorX,
        top: cursorY,
        translateX: '-50%',
        translateY: '-50%',
        scale,
        willChange: 'transform',
      }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: reducedMotion ? 0.05 : 0.15 }}
    >
      <IMessageDotCursor />
    </motion.div>
  );
}
