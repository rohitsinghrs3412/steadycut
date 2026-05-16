import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SteadyCut",
    short_name: "SteadyCut",
    description: "A private daily app for weight, meals, habits, and coaching.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f9fbf8",
    theme_color: "#2fa569",
    categories: ["health", "fitness", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
