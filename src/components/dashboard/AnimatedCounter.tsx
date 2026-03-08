import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { formatKr } from "@/lib/budgetCalculator";

interface AnimatedCounterProps {
  /** Target value to count to */
  target: number;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Format as currency (default) or percentage */
  format?: "currency" | "percent" | "raw";
  /** CSS class */
  className?: string;
  /** Suffix to append */
  suffix?: string;
  /** Prefix to prepend */
  prefix?: string;
}

/**
 * Shared animated counter component.
 * Counts from 0 → target with ease-out-quart on scroll-into-view.
 * Replaces FlowCounter, PctCounter, and inline counters.
 */
export function AnimatedCounter({
  target,
  delay = 0,
  duration = 800,
  format = "currency",
  className,
  suffix,
  prefix,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [isInView, target, delay, duration]);

  const formatted =
    format === "percent"
      ? `${value}%`
      : format === "raw"
      ? String(value)
      : formatKr(value);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
