"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Animated count-up number. Respects prefers-reduced-motion (jumps to final
 * value instantly). Uses requestAnimationFrame with an ease-out curve.
 */
export function CountUp({
  value,
  duration = 900,
  className,
  format = false,
}: {
  value: number;
  duration?: number;
  className?: string;
  /** Format with thousands separators (e.g. 1,234). */
  format?: boolean;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(reduce ? value : 0);
  const rafRef = React.useRef<number | null>(null);
  const fromRef = React.useRef(0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (to - from) * eased);
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration, reduce]);

  const text = format ? display.toLocaleString() : String(display);
  return <span className={className}>{text}</span>;
}
