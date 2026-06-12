import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InsureFlow — Broker Portal",
    short_name: "InsureFlow",
    description:
      "Professional insurance broker portal. Manage quotes and policies.",
    start_url: "/dashboard",
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
