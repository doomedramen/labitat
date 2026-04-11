import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Labitat",
    short_name: "Labitat",
    description: "A self-hosted homelab dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f4fa",
    theme_color: "#f2f4fa",
    categories: ["productivity", "utilities"],
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
