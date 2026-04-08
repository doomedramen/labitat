import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type CalibreWebData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  books: number
  authors: number
  series: number
  formats: number
}

function CalibreWebWidget({ books, authors, series, formats }: CalibreWebData) {
  return (
    <StatGrid
      items={[
        { value: books, label: "Books" },
        { value: authors, label: "Authors" },
        { value: series, label: "Series" },
        { value: formats, label: "Formats" },
      ]}
    />
  )
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

    // Login
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

    const cookie = loginRes.headers.getSetCookie?.().join("; ") ?? ""
    const headers = { Cookie: cookie }

    // Get stats from the main page
    const res = await fetch(`${baseUrl}/`, { headers })
    if (!res.ok) throw new Error(`Calibre-Web error: ${res.status}`)

    const html = await res.text()

    // Parse stats from HTML (Calibre-Web shows them in the sidebar)
    const extractStat = (label: string): number => {
      const regex = new RegExp(`${label}\\s*[:\\s]*(\\d+)`, "i")
      const match = html.match(regex)
      return match ? parseInt(match[1], 10) : 0
    }

    return {
      _status: "ok",
      books: extractStat("Books") || extractStat("books"),
      authors: extractStat("Authors") || extractStat("authors"),
      series: extractStat("Series") || extractStat("series"),
      formats: extractStat("Formats") || extractStat("formats"),
    }
  },
  Widget: CalibreWebWidget,
}
