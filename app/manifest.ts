// Path: medicalend-web/app/manifest.ts

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",

    name: "MediCalend",

    short_name: "MediCalend",

    description:
      "Programări medicale și urmărirea parcursului pacientului într-un singur loc.",

    start_url: "/dashboard",

    scope: "/",

    display: "standalone",

    orientation: "any",

    background_color: "#f7f9fc",

    theme_color: "#2563eb",

    lang: "ro",

    categories: ["medical", "health", "productivity"],

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}