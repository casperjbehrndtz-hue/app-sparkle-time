import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { formatKr } from "@/lib/budgetCalculator";
import { Check, X, Pencil } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface EditableAmountProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  localeCode?: string;
  className?: string;
  /** If false, shows as plain text */
  editable?: boolean;
}

export function EditableAmount({
  value,
  onChange,
  min = 0,
  max = 80000,
  step = 100,
  suffix = "kr.",
  localeCode = "da-DK",
  className = "",
  editable = true,
}: EditableAmountProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) {
      setTempValue(value);
      setInputValue(String(value));
      // Focus input after animation
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [editing, value]);

  // Close on click outside
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing]);

  const handleConfirm = () => {
    const clamped = Math.max(min, Math.min(max, tempValue));
    onChange(clamped);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const num = Number(raw);
    if (!isNaN(num) && raw !== "") {
      setTempValue(Math.max(min, Math.min(max, num)));
    }
  };

  const handleInputBlur = () => {
    const num = Number(inputValue);
    if (isNaN(num) || inputValue === "") {
      setInputValue(String(tempValue));
    } else {
      const clamped = Math.max(min, Math.min(max, num));
      setTempValue(clamped);
      setInputValue(String(clamped));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  };

  if (!editable) {
    return <span className={className}>{formatKr(value, localeCode)} {suffix}</span>;
  }

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence mode="wait">
        {!editing ? (
          <motion.button
            key="display"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(true)}
            className={`group inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/5 active:bg-primary/10 transition-colors cursor-pointer ${className}`}
            title={t("edit.clickToEdit")}
          >
            <span>{formatKr(value, localeCode)} {suffix}</span>
            <Pencil className="w-2.5 h-2.5 text-muted-foreground/0 group-hover:text-primary/60 transition-colors" />
          </motion.button>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute z-50 left-1/2 -translate-x-1/2 top-1/2 sm:top-full -translate-y-1/2 sm:translate-y-0 sm:mt-2 min-w-[16rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background shadow-xl shadow-black/10 p-3 space-y-3"
          >
            {/* Input */}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm font-display font-bold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 no-spin"
              />
              <span className="text-xs text-muted-foreground">{suffix}</span>
            </div>

            {/* Slider */}
            <div style={{ touchAction: "none" }}>
              <Slider
                min={min}
                max={max}
                step={step}
                value={[tempValue]}
                onValueChange={([v]) => {
                  setTempValue(v);
                  setInputValue(String(v));
                }}
                className="w-full"
                aria-label={t("edit.clickToEdit")}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatKr(min, localeCode)} {suffix}</span>
              <span>{formatKr(max, localeCode)} {suffix}</span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-1.5">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3 inline mr-1" />{t("edit.cancel")}
              </button>
              <button
                onClick={handleConfirm}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Check className="w-3 h-3 inline mr-1" />{t("edit.save")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
