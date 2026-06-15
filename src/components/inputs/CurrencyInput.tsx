"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateCurrency } from "@/utils/validate";

interface Props {
  placeholder?: string;
  min?: number;
  max?: number;
  initialValue?: number;
  onSubmit: (value: number, displayValue: string) => void;
}

export default function CurrencyInput({ placeholder, min, max, initialValue, onSubmit }: Props) {
  const [raw, setRaw] = useState(initialValue != null ? String(initialValue) : "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validate = (v: string) => validateCurrency(v, { min, max });

  const handleBlur = () => {
    if (raw) setError(validate(raw));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setRaw(digits);
    setError("");
  };

  const handleSubmit = () => {
    const err = validate(raw);
    setError(err);
    if (err) return;
    const num = Number(raw);
    onSubmit(num, `$${num.toLocaleString()} CAD`);
  };

  const formatted = raw ? Number(raw).toLocaleString() : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-1.5"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm pointer-events-none select-none">
            $
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={formatted}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder ?? "0"}
            className={`w-full pl-7 pr-16 py-3 bg-white border-2 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors ${
              error
                ? "border-rose-400 focus:border-rose-500"
                : "border-slate-200 focus:border-indigo-400"
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none select-none">
            CAD
          </span>
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
      {!error && min !== undefined && (
        <p className="text-xs text-slate-400 px-1">
          Minimum ${min.toLocaleString()} CAD
          {max !== undefined ? ` — Maximum $${max.toLocaleString()} CAD` : ""}
        </p>
      )}
    </motion.div>
  );
}
