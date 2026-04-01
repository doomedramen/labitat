import "./globals.css"
import type { Viewport, Metadata } from "next"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function getAppTitle() {
  try {
    const titleSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "dashboardTitle"),
    })
    return titleSetting?.value ?? "Labitat"
  } catch {
    return "Labitat"
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = await getAppTitle()
  return {
    title,
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2035" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
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
          {children}
          <Toaster richColors position="bottom-right" />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  )
}
