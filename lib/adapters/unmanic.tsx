import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type UnmanicData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeWorkers: number
  totalWorkers: number
  queueLength: number
}

function UnmanicWidget({
  activeWorkers,
  totalWorkers,
  queueLength,
}: UnmanicData) {
  const items = [
    { value: activeWorkers.toLocaleString(), label: "Active Workers" },
    { value: totalWorkers.toLocaleString(), label: "Total Workers" },
    { value: queueLength.toLocaleString(), label: "Queue Length" },
  ]

  return <StatGrid items={items} />
}

export const unmanicDefinition: ServiceDefinition<UnmanicData> = {
  id: "unmanic",
  name: "Unmanic",
  icon: "unmanic",
  category: "media",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://unmanic.example.org",
      helperText: "The base URL of your Unmanic instance",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    const [workersRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/unmanic/api/v2/workers/status`),
      fetch(`${baseUrl}/unmanic/api/v2/pending/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    ])

    if (!workersRes.ok) {
      if (workersRes.status === 404)
        throw new Error("Unmanic not found at this URL")
      throw new Error(`Unmanic error: ${workersRes.status}`)
    }

    const workersData = await workersRes.json()
    const queueData = queueRes.ok ? await queueRes.json() : { recordsTotal: 0 }

    // workers_status is an array of worker objects with 'idle' property
    const workersStatus = workersData.workers_status ?? []
    const totalWorkers = workersStatus.length
    const activeWorkers = workersStatus.filter(
      (w: { idle: boolean }) => !w.idle
    ).length

    // API returns camelCase: recordsTotal
    const queueLength = queueData.recordsTotal ?? queueData.records_total ?? 0

    return {
      _status: "ok" as const,
      activeWorkers,
      totalWorkers,
      queueLength,
    }
  },

  Widget: UnmanicWidget,
}
