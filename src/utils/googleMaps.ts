// Lazily loads the Google Maps JS API (with the Places library) once.
// Resolves to the google.maps namespace, or null when no API key is set
// (so callers can gracefully fall back to a plain text input).

/* eslint-disable @typescript-eslint/no-explicit-any */
let loadPromise: Promise<any | null> | null = null;

export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function loadGoogleMaps(): Promise<any | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!GOOGLE_MAPS_KEY) return Promise.resolve(null);
  if ((window as any).google?.maps) return Promise.resolve((window as any).google.maps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__insureflowInitGmaps";
    (window as any)[callbackName] = () => resolve((window as any).google.maps);

    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}` +
      `&libraries=places&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function mapEmbedUrl(address: string): string | null {
  if (!GOOGLE_MAPS_KEY) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encodeURIComponent(
    address
  )}&zoom=16`;
}

// Static map PNG (for embedding in the PDF). Requires the
// "Maps Static API" to be enabled on the key.
export function staticMapUrl(address: string): string | null {
  if (!GOOGLE_MAPS_KEY) return null;
  const q = encodeURIComponent(address);
  return (
    `https://maps.googleapis.com/maps/api/staticmap?center=${q}` +
    `&zoom=16&size=640x280&scale=2&markers=color:0x4f46e5%7C${q}&key=${GOOGLE_MAPS_KEY}`
  );
}
