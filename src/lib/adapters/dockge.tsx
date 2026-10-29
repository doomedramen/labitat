import type { ServiceDefinition } from "./types";
import { Container, Play } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { validateResponse } from "./validate";

type DockgeData = { _status: "ok"; containers: number; running: number };
export const dockgeDefinition: ServiceDefinition<DockgeData> = {
  id: "dockge",
  name: "Dockge",
  icon: "dockge",
  category: "monitoring",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "url",
      label: "Docker API / socket proxy URL",
      type: "url",
      required: true,
      placeholder: "http://docker-proxy:2375",
      helperText:
        "Docker endpoint for the host managed by Dockge. Requires read access to GET /info; the Dockge web URL cannot provide total container counts.",
    },
  ],
  async fetchData(config) {
    if (!config.url) throw new Error("Docker API URL is required");
    const response = await fetchWithTimeout(`${config.url.replace(/\/+$/, "")}/info`);
    if (!response.ok) throw new Error(`Dockge Docker info error: ${response.status}`);
    const info = validateResponse<{ Containers: number; ContainersRunning: number }>(
      await response.json(),
      ["Containers", "ContainersRunning"],
      [
        { path: "Containers", type: "number" },
        { path: "ContainersRunning", type: "number" },
      ],
      { adapter: "dockge" },
    );
    if (
      !Number.isSafeInteger(info.Containers) ||
      !Number.isSafeInteger(info.ContainersRunning) ||
      info.Containers < 0 ||
      info.ContainersRunning < 0 ||
      info.ContainersRunning > info.Containers
    )
      throw new Error("Dockge invalid container counts");
    return { _status: "ok", containers: info.Containers, running: info.ContainersRunning };
  },
  toPayload(data) {
    return {
      stats: [
        { id: "containers", label: "Containers", value: data.containers, icon: Container },
        { id: "running", label: "Running", value: data.running, icon: Play },
      ],
    };
  },
};
