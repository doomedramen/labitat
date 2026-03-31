import "./globals.css"
import type { Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { cn } from "@/lib/utils"

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
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  )
}
