import { Geist_Mono, Inter } from "next/font/google"
import type { Viewport, Metadata } from "next"
import { cookies } from "next/headers"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeColorUpdater } from "@/components/theme-color-updater"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { TooltipProvider } from "@/components/ui/tooltip"

import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const PALETTE_COOKIE = "labitat-palette"
const THEME_COOKIE = "labitat-theme"
const DEFAULT_PALETTE = "default"
const DEFAULT_THEME = "system"

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
  return {
    title,
    icons: {
      icon: [
        { url: "/favicon.ico", type: "image/x-icon" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
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
      className={cn("font-sans antialiased", inter.variable, fontMono.variable)}
    >
      <body>
        <ThemeProvider attribute="class" serverTheme={theme} enableSystem>
          <TooltipProvider delayDuration={0} skipDelayDuration={300}>
            <ThemeColorUpdater />
            {children}
            <Toaster richColors position="top-right" />
            <ServiceWorkerRegistrar />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
