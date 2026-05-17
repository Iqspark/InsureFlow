"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateDate } from "@/utils/validate";

interface Props {
  onSubmit: (value: string, displayValue: string) => void;
  minDate?: string;   // ISO string "YYYY-MM-DD"
  maxDate?: string;   // ISO string "YYYY-MM-DD"
  allowFuture?: boolean;
  allowPast?: boolean;
}

export default function DateInput({
  onSubmit,
  minDate,
  maxDate,
  allowFuture,
  allowPast,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validate = (v: string) =>
    validateDate(v, { minDate, maxDate, allowFuture, allowPast });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setError("");
  };

  const handleBlur = () => {
    if (value) setError(validate(value));
  };

  const handleSubmit = () => {
    const err = validate(value);
    setError(err);
    if (err) return;
    const date = new Date(value);
    const display = date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    onSubmit(value, display);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-1.5"
    >
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="date"
          aria-label="Select date"
          value={value}
          min={minDate}
          max={maxDate}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className={`flex-1 px-4 py-3 bg-white border-2 rounded-xl text-sm text-slate-800 transition-colors ${
            error
              ? "border-rose-400 focus:border-rose-500"
              : "border-slate-200 focus:border-indigo-400"
          }`}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
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
    </motion.div>
  );
}
