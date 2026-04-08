import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type SABnzbdData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  speed: string
  remaining: string
  queueSize: number
  downloading: boolean
}

function SABnzbdWidget({
  speed,
  remaining,
  queueSize,
  downloading,
}: SABnzbdData) {
  return (
    <StatGrid
      items={[
        { value: downloading ? speed : "Idle", label: "Speed" },
        { value: downloading ? remaining : "—", label: "Remaining" },
        { value: queueSize, label: "Queue" },
      ]}
    />
  )
}

export const sabnzbdDefinition: ServiceDefinition<SABnzbdData> = {
  id: "sabnzbd",
  name: "SABnzbd",
  icon: "sabnzbd",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sabnzbd.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your SABnzbd API key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const url = `${baseUrl}/api?output=json&apikey=${config.apiKey}&mode=queue`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`SABnzbd error: ${res.status}`)

    const data = await res.json()
    const queue = data.queue ?? {}

    return {
      _status: "ok",
      speed: queue.speed ?? "0 B/s",
      remaining: queue.timeleft ?? "—",
      queueSize: queue.noofslots ?? 0,
      downloading: queue.status === "Downloading",
    }
  },
  Widget: SABnzbdWidget,
}
