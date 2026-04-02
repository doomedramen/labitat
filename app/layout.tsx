import "./globals.css"
import type { Viewport, Metadata } from "next"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { SWRProvider } from "@/components/swr-provider"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function getAppSettings() {
  try {
    const rows = await db.query.settings.findMany({
      where: (s, { inArray }) => inArray(s.key, ["dashboardTitle", "palette"]),
    })
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      title: map.dashboardTitle ?? "Labitat",
      palette: map.palette ?? "default",
    }
  } catch {
    return { title: "Labitat", palette: "default" }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { title } = await getAppSettings()
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
  const { palette } = await getAppSettings()
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette={palette}
      className={cn("font-sans antialiased")}
    >
      <head />
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SWRProvider>
            {children}
            <Toaster richColors position="top-right" />
            <ServiceWorkerRegistrar />
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
