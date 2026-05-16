"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  placeholder?: string;
  min?: number;
  max?: number;
  onSubmit: (value: number, displayValue: string) => void;
}

export default function CurrencyInput({ placeholder, min, max, onSubmit }: Props) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Strip non-numeric characters for parsing
  const parseValue = (s: string) =>
    Number(s.replace(/[^0-9.]/g, ""));

  const handleSubmit = () => {
    const num = parseValue(raw);
    if (!raw || isNaN(num) || num === 0) {
      setError("Please enter a valid dollar amount.");
      return;
    }
    if (min !== undefined && num < min) {
      setError(`Minimum is $${min.toLocaleString()}.`);
      return;
    }
    if (max !== undefined && num > max) {
      setError(`Maximum is $${max.toLocaleString()}.`);
      return;
    }
    setError("");
    onSubmit(num, `$${num.toLocaleString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setRaw(digits);
    setError("");
  };

  const formatted = raw
    ? Number(raw).toLocaleString()
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm pointer-events-none">
            $
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={formatted}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder ?? "0"}
            className="w-full pl-7 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-indigo-700 active:scale-[0.97]"
        >
          →
        </button>
      </div>
      {error && <p className="text-xs text-rose-500 px-1">{error}</p>}
      {min && (
        <p className="text-xs text-slate-400 px-1">
          Minimum ${min.toLocaleString()}
          {max ? ` — Maximum $${max.toLocaleString()}` : ""}
        </p>
      )}
    </motion.div>
  );
}
