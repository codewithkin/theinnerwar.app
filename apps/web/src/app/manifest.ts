import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Inner War",
    short_name: "Inner War",
    description: "One lesson, one mission and one line of evidence a day.",
    start_url: "/",
    display: "standalone",
    background_color: "#131110",
    theme_color: "#131110",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
