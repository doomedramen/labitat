import { defineConfig, DefaultTheme } from "vitepress"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsDir = path.resolve(__dirname, "../")

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "index.md")
    .map((f) => f.replace(".md", ""))
    .sort()
}

function getSubdirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .sort()
}

function buildServicesSidebar(): DefaultTheme.SidebarItem[] {
  const servicesDir = path.join(docsDir, "services")
  const items: DefaultTheme.SidebarItem[] = [
    { text: "Overview", link: "/services/" },
  ]

  const subdirs = getSubdirs(servicesDir)
  for (const subdir of subdirs) {
    const files = getMarkdownFiles(path.join(servicesDir, subdir))
    if (files.length > 0) {
      items.push({
        text: slugToTitle(subdir),
        collapsed: true,
        items: files.map((f) => ({
          text: slugToTitle(f),
          link: `/services/${subdir}/${f}`,
        })),
      })
    }
  }

  // Also pick up any loose .md files in the services root
  const rootFiles = getMarkdownFiles(servicesDir)
  if (rootFiles.length > 0) {
    items.push(
      ...rootFiles.map((f) => ({
        text: slugToTitle(f),
        link: `/services/${f}`,
      }))
    )
  }

  return items
}

function buildInstallationSidebar(): DefaultTheme.SidebarItem[] {
  const installDir = path.join(docsDir, "installation")
  const items: DefaultTheme.SidebarItem[] = [
    { text: "Overview", link: "/installation/" },
  ]

  const files = getMarkdownFiles(installDir)
  if (files.length > 0) {
    items.push(
      ...files.map((f) => ({
        text: slugToTitle(f),
        link: `/installation/${f}`,
      }))
    )
  }

  return items
}

function buildSidebar() {
  return {
    "/": [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Quick Start", link: "/getting-started" },
          ...buildInstallationSidebar(),
          { text: "Configuration", link: "/configuration" },
          { text: "Development", link: "/development" },
        ],
      },
      {
        text: "Services",
        items: buildServicesSidebar(),
      },
      {
        text: "Resources",
        items: [
          { text: "Adding a Service", link: "/adding-a-service" },
          { text: "Security", link: "/security" },
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Contributing", link: "/contributing" },
        ],
      },
    ],
  }
}

export default defineConfig({
  title: "Labitat",
  description:
    "A modern, self-hosted homelab dashboard with live service widgets, drag-and-drop layout, and full PWA support.",
  base: process.env.DOCS_BASE || "/labitat/",
  lastUpdated: true,
  cleanUrls: true,
  outDir: ".vitepress/dist",

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["meta", { name: "theme-color", content: "#16a34a" }],
  ],

  themeConfig: {
    logo: { src: "/logo.svg", width: 24, height: 24 },
    siteTitle: "Labitat",

    nav: [
      { text: "Documentation", link: "/" },
      { text: "Services", link: "/services/" },
      {
        text: "GitHub",
        link: "https://github.com/DoomedRamen/labitat",
      },
    ],

    sidebar: buildSidebar(),

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/DoomedRamen/labitat",
      },
    ],

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/DoomedRamen/labitat/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Labitat Contributors",
    },

    outline: {
      level: [2, 3],
      label: "On this page",
    },
  },

  markdown: {
    lineNumbers: true,
  },
})
