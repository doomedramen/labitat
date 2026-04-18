import { Geist_Mono, Inter } from "next/font/google";
import type { Viewport, Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorUpdater } from "@/components/theme-color-updater";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { AppToaster } from "@/components/ui/app-toaster";
import { OverlayHost } from "@/components/ui/overlay-host";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { SplashScreenLinks } from "@/components/splash-screen-links";
import { ConnectivityProvider } from "@/components/connectivity-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const PALETTE_COOKIE = "labitat-palette";
const THEME_COOKIE = "labitat-theme";
const BACKGROUND_COOKIE = "labitat-background";
const SCALE_COOKIE = "labitat-bg-scale";
const OPACITY_COOKIE = "labitat-bg-opacity";
const DEFAULT_PALETTE = "default";
const DEFAULT_THEME = "system";
const DEFAULT_BACKGROUND = "none";
const DEFAULT_SCALE = "1";
const DEFAULT_OPACITY = "1";

async function getPalette(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(PALETTE_COOKIE)?.value ?? DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

async function getTheme(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(THEME_COOKIE)?.value ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

async function getBackground(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(BACKGROUND_COOKIE)?.value ?? DEFAULT_BACKGROUND;
  } catch {
    return DEFAULT_BACKGROUND;
  }
}

async function getBgScale(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SCALE_COOKIE)?.value ?? DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

async function getBgOpacity(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(OPACITY_COOKIE)?.value ?? DEFAULT_OPACITY;
  } catch {
    return DEFAULT_OPACITY;
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
    appleWebApp: {
      capable: true,
      title: title,
      statusBarStyle: "black",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2035" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [palette, theme, background, bgScale, bgOpacity] = await Promise.all([
    getPalette(),
    getTheme(),
    getBackground(),
    getBgScale(),
    getBgOpacity(),
  ]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette={palette}
      data-background={background}
      className={cn("font-sans antialiased", inter.variable, fontMono.variable)}
      style={
        {
          "--bg-scale": bgScale,
          "--bg-opacity": bgOpacity,
        } as React.CSSProperties
      }
    >
      <SplashScreenLinks />
      <body>
        <ThemeProvider attribute="class" serverTheme={theme} enableSystem>
          <ThemeColorUpdater />
          <TooltipProvider>{children}</TooltipProvider>
          <OverlayHost />
          <AppToaster />
          <ServiceWorkerRegistrar />
          <ConnectivityProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
