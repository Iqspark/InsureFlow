"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateNumber } from "@/utils/validate";

interface Props {
  placeholder?: string;
  min?: number;
  max?: number;
  suffix?: string;
  mustBeInteger?: boolean;
  onSubmit: (value: number, displayValue: string) => void;
}

export default function NumberInput({
  placeholder,
  min,
  max,
  suffix,
  mustBeInteger,
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validate = (v: string) => validateNumber(v, { min, max, mustBeInteger });

  const handleBlur = () => {
    if (value) setError(validate(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setError("");
  };

  const handleSubmit = () => {
    const err = validate(value);
    setError(err);
    if (err) return;
    const num = Number(value);
    const display = suffix ? `${num.toLocaleString()} ${suffix}` : num.toLocaleString();
    onSubmit(num, display);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-1.5"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="number"
            inputMode={mustBeInteger ? "numeric" : "decimal"}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder ?? "Enter a number…"}
            min={min}
            max={max}
            step={mustBeInteger ? 1 : undefined}
            className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors pr-12 ${
              error
                ? "border-rose-400 focus:border-rose-500"
                : "border-slate-200 focus:border-indigo-400"
            }`}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-indigo-700 active:scale-[0.97]"
        >
          →
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-rose-500 px-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {!error && (min !== undefined || max !== undefined) && (
        <p className="text-xs text-slate-400 px-1">
          {min !== undefined && max !== undefined
            ? `Range: ${min.toLocaleString()} – ${max.toLocaleString()}`
            : min !== undefined
            ? `Minimum: ${min.toLocaleString()}`
            : `Maximum: ${max!.toLocaleString()}`}
          {mustBeInteger ? " (whole number)" : ""}
        </p>
      )}
    </motion.div>
  );
}
