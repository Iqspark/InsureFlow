"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  placeholder?: string;
  min?: number;
  max?: number;
  suffix?: string;
  onSubmit: (value: number, displayValue: string) => void;
}

export default function NumberInput({
  placeholder,
  min,
  max,
  suffix,
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const num = Number(value);
    if (!value || isNaN(num)) {
      setError("Please enter a valid number.");
      return;
    }
    if (min !== undefined && num < min) {
      setError(`Minimum value is ${min.toLocaleString()}.`);
      return;
    }
    if (max !== undefined && num > max) {
      setError(`Maximum value is ${max.toLocaleString()}.`);
      return;
    }
    setError("");
    const display = suffix ? `${num.toLocaleString()} ${suffix}` : num.toLocaleString();
    onSubmit(num, display);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder ?? "Enter a number…"}
            min={min}
            max={max}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 pr-12"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-indigo-700 active:scale-[0.97]"
        >
          →
        </button>
      </div>
      {error && <p className="text-xs text-rose-500 px-1">{error}</p>}
      {(min || max) && (
        <p className="text-xs text-slate-400 px-1">
          {min && max
            ? `Range: ${min.toLocaleString()} – ${max.toLocaleString()}`
            : min
            ? `Minimum: ${min.toLocaleString()}`
            : `Maximum: ${max!.toLocaleString()}`}
        </p>
      )}
    </motion.div>
  );
}
