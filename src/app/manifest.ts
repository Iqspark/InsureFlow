import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vacant Home Insurance — Get a Quote",
    short_name: "VHI Quote",
    description:
      "Get an instant quote for vacant home insurance in minutes. No paperwork, no hassle.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8faff",
    theme_color: "#4f46e5",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
