import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type MatrixData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  users: number
  rooms: number
  messages: number
  version: string
}

function MatrixWidget({ users, rooms, messages, version }: MatrixData) {
  return (
    <StatGrid
      items={[
        { value: users, label: "Users" },
        { value: rooms, label: "Rooms" },
        { value: messages, label: "Messages" },
        { value: version, label: "Version" },
      ]}
    />
  )
}

export const matrixDefinition: ServiceDefinition<MatrixData> = {
  id: "matrix",
  name: "Matrix (Synapse)",
  icon: "element",
  category: "productivity",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://matrix.example.org",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // Get public stats (if enabled)
    const statsRes = await fetch(`${baseUrl}/_synapse/admin/v1/statistics`)

    if (!statsRes.ok) {
      // Stats endpoint not available, just report reachable
      return {
        _status: "ok",
        users: 0,
        rooms: 0,
        messages: 0,
        version: "Online",
      }
    }

    const stats = await statsRes.json()

    return {
      _status: "ok",
      users: stats.total_users ?? 0,
      rooms: stats.total_public_rooms ?? 0,
      messages: 0,
      version: "Online",
    }
  },
  Widget: MatrixWidget,
}
