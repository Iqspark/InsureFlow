"use client";

import { mapEmbedUrl } from "@/utils/googleMaps";

export default function PropertyMap({ address }: { address: string }) {
  const src = mapEmbedUrl(address);

  if (!src) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 text-sm text-slate-400">
        Map unavailable — set <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> to display the property location.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Property Location
        </h2>
      </div>
      <iframe
        title="Property location"
        src={src}
        className="w-full h-72"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
