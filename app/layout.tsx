import "./globals.css"
import type { Viewport, Metadata } from "next"
import { cookies } from "next/headers"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { SWRProvider } from "@/components/swr-provider"
import { ReconnectionBanner } from "@/components/reconnection-banner"
import { ThemeColorUpdater } from "@/components/theme-color-updater"
import { SerwistProvider } from "@/components/serwist-provider"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import packageJson from "@/package.json"

const PALETTE_COOKIE = "labitat-palette"
const THEME_COOKIE = "labitat-theme"
const DEFAULT_PALETTE = "default"
const DEFAULT_THEME = "system"

// Icon cache version from package.json - busts cache on every release
const ICON_VERSION = packageJson.version

async function getPalette(): Promise<string> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(PALETTE_COOKIE)?.value ?? DEFAULT_PALETTE
  } catch {
    return DEFAULT_PALETTE
  }
}

async function getTheme(): Promise<string> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(THEME_COOKIE)?.value ?? DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

async function getAppTitle(): Promise<string> {
  try {
    const row = await db.query.settings.findFirst({
      where: (s, { eq }) => eq(s.key, "dashboardTitle"),
    })
    return row?.value ?? "Labitat"
  } catch {
    return "Labitat"
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = await getAppTitle()
  const v = `?v=${ICON_VERSION}`

  return {
    title,
    icons: {
      icon: [
        { url: `/favicon.ico${v}`, type: "image/x-icon" },
        { url: `/favicon-16x16.png${v}`, sizes: "16x16", type: "image/png" },
        { url: `/favicon-32x32.png${v}`, sizes: "32x32", type: "image/png" },
      ],
      apple: [
        {
          url: `/apple-touch-icon.png${v}`,
          sizes: "180x180",
          type: "image/png",
        },
        {
          url: `/apple-touch-icon-120x120.png${v}`,
          sizes: "120x120",
          type: "image/png",
        },
        {
          url: `/apple-touch-icon-152x152.png${v}`,
          sizes: "152x152",
          type: "image/png",
        },
        {
          url: `/apple-touch-icon-167x167.png${v}`,
          sizes: "167x167",
          type: "image/png",
        },
        {
          url: `/apple-touch-icon-512x512.png${v}`,
          sizes: "512x512",
          type: "image/png",
        },
        {
          url: `/apple-touch-icon-1024x1024.png${v}`,
          sizes: "1024x1024",
          type: "image/png",
        },
      ],
    },
    // Apple status bar - translucent lets our bg color show through
    appleWebApp: {
      statusBarStyle: "black-translucent",
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2035" },
  ],
  colorScheme: "light dark",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [palette, theme] = await Promise.all([getPalette(), getTheme()])
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette={palette}
      className={cn("font-sans antialiased")}
    >
      <body>
        <ThemeProvider attribute="class" serverTheme={theme} enableSystem>
          <SerwistProvider swUrl="/serwist/sw.js">
            <ThemeColorUpdater />
            <SWRProvider>
              <ReconnectionBanner />
              {children}
              <Toaster richColors position="top-right" />
              <ServiceWorkerRegistrar />
            </SWRProvider>
          </SerwistProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
