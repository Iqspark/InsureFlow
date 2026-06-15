"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Option } from "@/types";

interface Props {
  options: Option[];
  placeholder?: string;
  initialValue?: string | number | boolean;
  onSelect: (value: string | number, displayValue: string) => void;
}

export default function DropdownInput({ options, placeholder, initialValue, onSelect }: Props) {
  const initialOpt =
    initialValue != null ? options.find((o) => o.value === initialValue) ?? null : null;
  const [query, setQuery] = useState(initialOpt?.label ?? "");
  const [selected, setSelected] = useState<Option | null>(initialOpt);

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const handleSelect = (opt: Option) => {
    setSelected(opt);
    setQuery(opt.label);
    onSelect(opt.value, opt.label);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-2"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
        }}
        placeholder={placeholder ?? "Type to search…"}
        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 transition-colors"
        autoFocus
      />

      {!selected && filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
