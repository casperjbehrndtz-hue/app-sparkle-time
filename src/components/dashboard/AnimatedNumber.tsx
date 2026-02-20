import { useEffect, useRef, useState } from "react";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, duration = 1500, className }: Props) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  const startValRef = useRef(0);

  useEffect(() => {
    startValRef.current = displayed;
    startRef.current = undefined;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayed(Math.round(startValRef.current + (value - startValRef.current) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{formatKr(displayed)}</span>;
}
