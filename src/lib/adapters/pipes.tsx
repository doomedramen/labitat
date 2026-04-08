import type { ServiceDefinition } from "./types"

type PipesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  message: string
}

function PipesWidget({ message }: PipesData) {
  return (
    <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export const pipesDefinition: ServiceDefinition<PipesData> = {
  id: "pipes",
  name: "Pipes",
  icon: "pipes",
  category: "info",
  configFields: [
    {
      key: "message",
      label: "Message",
      type: "text",
      required: false,
      placeholder: "Hello, World!",
      helperText: "Custom message to display",
    },
  ],
  fetchData(config) {
    return Promise.resolve({
      _status: "ok",
      message: config.message || "Pipes connected!",
    })
  },
  Widget: PipesWidget,
}
