import "./globals.css"
import type { Viewport, Metadata } from "next"
import { cookies } from "next/headers"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { SWRProvider } from "@/components/swr-provider"
import { ReconnectionBanner } from "@/components/reconnection-banner"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"

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
  return { title }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2035" },
  ],
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
          <SWRProvider>
            <ReconnectionBanner />
            {children}
            <Toaster richColors position="top-right" />
            <ServiceWorkerRegistrar />
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
