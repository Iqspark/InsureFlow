"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateEmail, validateName, validatePhone } from "@/utils/validate";

interface Props {
  placeholder?: string;
  onSubmit: (value: string, displayValue: string) => void;
  required?: boolean;
  inputType?: "email" | "name" | "phone" | "text";
  minLength?: number;
  maxLength?: number;
}

export default function TextInput({
  placeholder,
  onSubmit,
  required,
  inputType = "text",
  minLength,
  maxLength,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function validate(v: string): string {
    const trimmed = v.trim();
    if (inputType === "email") return validateEmail(trimmed);
    if (inputType === "name") return validateName(trimmed);
    if (inputType === "phone") return validatePhone(trimmed);
    if (required && !trimmed) return "This field is required.";
    if (minLength && trimmed.length < minLength)
      return `Must be at least ${minLength} characters.`;
    if (maxLength && trimmed.length > maxLength)
      return `Must be ${maxLength} characters or fewer.`;
    return "";
  }

  const handleBlur = () => {
    setTouched(true);
    setError(validate(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (touched) setError(validate(e.target.value));
  };

  const handleSubmit = () => {
    setTouched(true);
    const err = validate(value);
    setError(err);
    if (err) return;
    onSubmit(value.trim(), value.trim());
  };

  const isValid = touched && !error && value.trim().length > 0;

  const borderColor = error
    ? "border-rose-400 focus:border-rose-500"
    : isValid
    ? "border-emerald-400 focus:border-emerald-500"
    : "border-slate-200 focus:border-indigo-400";

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
            type={inputType === "email" ? "email" : inputType === "phone" ? "tel" : "text"}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder ?? "Type your answer…"}
            maxLength={maxLength}
            className={`w-full px-4 py-3 bg-white border-2 ${borderColor} rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors pr-9`}
          />
          <AnimatePresence>
            {isValid && (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-base pointer-events-none"
              >
                ✓
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={required ? !value.trim() : false}
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
