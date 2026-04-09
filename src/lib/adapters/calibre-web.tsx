import type { ServiceDefinition } from "./types"
import { Book, PenTool, List, FileText } from "lucide-react"

type CalibreWebData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  books: number
  authors: number
  series: number
  formats: number
}

function calibreWebToPayload(data: CalibreWebData) {
  return {
    stats: [
      {
        id: "books",
        value: data.books,
        label: "Books",
        icon: Book,
      },
      {
        id: "authors",
        value: data.authors,
        label: "Authors",
        icon: PenTool,
      },
      {
        id: "series",
        value: data.series,
        label: "Series",
        icon: List,
      },
      {
        id: "formats",
        value: data.formats,
        label: "Formats",
        icon: FileText,
      },
    ],
  }
}

export const calibreWebDefinition: ServiceDefinition<CalibreWebData> = {
  id: "calibre-web",
  name: "Calibre-Web",
  icon: "calibre-web",
  category: "productivity",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://calibre.example.org",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "admin",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your Calibre-Web password",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // Login to get session cookie
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: config.username,
        password: config.password,
      }),
      redirect: "manual",
    })

    if (!loginRes.ok && loginRes.status !== 302) {
      throw new Error(`Calibre-Web login failed: ${loginRes.status}`)
    }

    const cookie = loginRes.headers.getSetCookie?.().join("; ") ?? ""
    const headers = { Cookie: cookie }

    // Use OPDS stats endpoint (JSON API - more reliable than HTML scraping)
    const statsRes = await fetch(`${baseUrl}/opds/stats`, { headers })

    if (!statsRes.ok) {
      throw new Error(`Calibre-Web stats error: ${statsRes.status}`)
    }

    const statsData = await statsRes.json()

    // OPDS stats returns an object with counts
    return {
      _status: "ok",
      books: statsData.books ?? statsData.total ?? 0,
      authors: statsData.authors ?? 0,
      series: statsData.series ?? 0,
      formats: statsData.formats ?? statsData.formats_total ?? 0,
    }
  },
  toPayload: calibreWebToPayload,
}
