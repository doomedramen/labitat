import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Labitat",
    short_name: "Labitat",
    description: "A self-hosted homelab dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Default palette light mode colors (fallback for PWA splash screen)
    // Actual theme colors are set via meta tags in layout.tsx
    background_color: "#f2f4fa",
    theme_color: "#f2f4fa",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
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
