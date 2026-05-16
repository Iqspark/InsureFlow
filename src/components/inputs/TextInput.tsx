"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  placeholder?: string;
  onSubmit: (value: string, displayValue: string) => void;
  required?: boolean;
}

export default function TextInput({ placeholder, onSubmit, required }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (required && !trimmed) return;
    if (trimmed) onSubmit(trimmed, trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-2"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder={placeholder ?? "Type your answer…"}
        className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400"
      />
      <button
        onClick={handleSubmit}
        disabled={required ? !value.trim() : false}
        className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        →
      </button>
    </motion.div>
  );
}
