import { Geist, Geist_Mono } from "next/font/google";
import type { Viewport, Metadata } from "next";
import { cookies } from "next/headers";

import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { AppToaster } from "@/components/ui/app-toaster";
import { OverlayHost } from "@/components/ui/overlay-host";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { SplashScreenLinks } from "@/components/splash-screen-links";
import { ConnectivityProvider } from "@/components/connectivity-provider";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const PALETTE_COOKIE = "labitat-palette";
const DEFAULT_PALETTE = "nord";

async function getPalette(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(PALETTE_COOKIE)?.value ?? DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

async function getAppTitle(): Promise<string> {
  try {
    const row = await db.query.settings.findFirst({
      where: (s, { eq }) => eq(s.key, "dashboardTitle"),
    });
    return row?.value ?? "Labitat";
  } catch {
    return "Labitat";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = await getAppTitle();
  return {
    title,
    icons: {
      icon: [
        { url: "/favicon.ico", type: "image/x-icon" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    other: {
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2e3440",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const palette = await getPalette();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette={palette}
      className={cn("font-sans antialiased", geist.variable, fontMono.variable)}
    >
      <SplashScreenLinks />
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <OverlayHost />
        <AppToaster />
        <ServiceWorkerRegistrar />
        <ConnectivityProvider />
      </body>
    </html>
  );
}
