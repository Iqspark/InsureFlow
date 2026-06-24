"use client";

import { motion } from "framer-motion";
import { Option } from "@/types";

interface Props {
  options: Option[];
  selected?: string | number | boolean;
  onSelect: (value: string | number, displayValue: string) => void;
}

export default function ChoiceInput({ options, selected, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="grid gap-2"
      style={{
        gridTemplateColumns:
          options.length <= 2
            ? "1fr 1fr"
            : options.length <= 4
            ? "repeat(2, 1fr)"
            : "repeat(2, 1fr)",
      }}
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onSelect(opt.value, opt.label)}
          className={`group flex flex-col items-start gap-0.5 px-4 py-3 bg-white border-2 rounded-xl text-left transition-all duration-150 hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50 active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-indigo-300 ${
            opt.value === selected ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200"
          }`}
        >
          {opt.emoji && (
            <span className="text-lg leading-none mb-0.5">{opt.emoji}</span>
          )}
          <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">
            {opt.label}
          </span>
          {opt.description && (
            <span className="text-xs text-slate-400 group-hover:text-indigo-400 leading-tight">
              {opt.description}
            </span>
          )}
        </button>
      ))}
    </motion.div>
  );
}
