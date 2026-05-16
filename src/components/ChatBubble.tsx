"use client";

import { motion } from "framer-motion";

interface ChatBubbleProps {
  type: "broker" | "user";
  text: string;
}

export default function ChatBubble({ type, text }: ChatBubbleProps) {
  if (type === "broker") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-start gap-2 max-w-[85%]"
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">A</span>
        </div>

        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-slate-800 text-sm leading-relaxed">
          {text}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-end"
    >
      <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] shadow-sm leading-relaxed">
        {text}
      </div>
    </motion.div>
  );
}
