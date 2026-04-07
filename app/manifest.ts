import type { MetadataRoute } from "next"
import packageJson from "@/package.json"

// Icon cache version from package.json - must match layout.tsx
const ICON_VERSION = packageJson.version

export default function manifest(): MetadataRoute.Manifest {
  const v = `?v=${ICON_VERSION}`

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
        src: `/icons/icon-96x96.png${v}`,
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: `/icons/icon-128x128.png${v}`,
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: `/icons/icon-144x144.png${v}`,
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: `/icons/icon-152x152.png${v}`,
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: `/icons/icon-192x192.png${v}`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `/icons/icon-384x384.png${v}`,
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: `/icons/icon-512x512.png${v}`,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: `/icons/icon-maskable-512x512.png${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // Larger icons for iOS splash screen and high-DPI displays
      {
        src: `/apple-touch-icon-512x512.png${v}`,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: `/apple-touch-icon-1024x1024.png${v}`,
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  }
}
