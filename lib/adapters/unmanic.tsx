import type { ServiceDefinition } from "./types"

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
    { value: activeWorkers, label: "Active Workers" },
    { value: totalWorkers, label: "Total Workers" },
    { value: queueLength, label: "Queue Length" },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
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
      placeholder: "https://unmanic.home.lab",
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
    const queueData = queueRes.ok ? await queueRes.json() : { records_total: 0 }

    // workers_status is an array of worker objects with 'idle' property
    const workersStatus = workersData.workers_status ?? []
    const totalWorkers = workersStatus.length
    const activeWorkers = workersStatus.filter(
      (w: { idle: boolean }) => !w.idle
    ).length

    // API returns snake_case: records_total
    const queueLength = queueData.records_total ?? queueData.recordsTotal ?? 0

    return {
      _status: "ok" as const,
      activeWorkers,
      totalWorkers,
      queueLength,
    }
  },

  Widget: UnmanicWidget,
}
