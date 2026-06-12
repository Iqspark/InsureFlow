"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadGoogleMaps, mapEmbedUrl } from "@/utils/googleMaps";

interface Props {
  placeholder?: string;
  onSubmit: (value: string, displayValue: string) => void;
}

export default function AddressInput({ placeholder, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    let autocomplete: any;
    loadGoogleMaps()
      .then((maps) => {
        if (!maps || !inputRef.current) return;
        autocomplete = new maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "ca" },
          fields: ["formatted_address"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const addr = place?.formatted_address ?? inputRef.current?.value ?? "";
          setValue(addr);
          setSelected(addr);
        });
      })
      .catch(() => {});
  }, []);

  const handleSubmit = () => {
    const addr = value.trim();
    if (!addr) return;
    onSubmit(addr, addr);
  };

  const embed = selected ? mapEmbedUrl(selected) : null;

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
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (selected) setSelected("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder ?? "Start typing the address…"}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-indigo-400 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>

      <AnimatePresence>
        {embed && (
          <motion.div
            key="map-preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-slate-200"
          >
            <iframe
              title="Property location"
              src={embed}
              className="w-full h-40"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
