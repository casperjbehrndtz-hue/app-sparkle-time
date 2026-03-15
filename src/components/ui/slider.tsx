import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ min = 0, max = 100, step = 1, value, defaultValue, onValueChange, className, disabled, "aria-label": ariaLabel }, ref) => {
    const val = value?.[0] ?? defaultValue?.[0] ?? min;
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className={cn("w-full", className)}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)`,
        }}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
