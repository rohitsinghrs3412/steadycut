import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SteadyCut",
    short_name: "SteadyCut",
    description: "A private daily app for weight, meals, habits, and coaching.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#070a10",
    theme_color: "#5b9cff",
    categories: ["health", "fitness", "productivity"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
