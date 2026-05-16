"use client";

import { motion } from "framer-motion";
import { Option } from "@/types";

interface Props {
  options: Option[]; // Exactly 2 options (Yes / No style)
  onSelect: (value: string | number, displayValue: string) => void;
}

export default function ToggleInput({ options, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-3"
    >
      {options.map((opt, i) => (
        <button
          key={String(opt.value)}
          onClick={() => onSelect(opt.value, opt.label)}
          className={`flex-1 py-4 rounded-2xl border-2 font-semibold text-sm transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-indigo-300
            ${
              i === 0
                ? "bg-white border-slate-200 text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700"
                : "bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </motion.div>
  );
}
