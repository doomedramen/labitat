import type { ServiceDefinition } from "./types";
import { Play, Square, Layers } from "lucide-react";

type PortainerData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  running: number;
  stopped: number;
  total: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function portainerToPayload(data: PortainerData) {
  return {
    stats: [
      {
        id: "running",
        value: (data.running ?? 0).toLocaleString(),
        label: "Running",
        icon: Play,
      },
      {
        id: "stopped",
        value: (data.stopped ?? 0).toLocaleString(),
        label: "Stopped",
        icon: Square,
      },
      {
        id: "total",
        value: (data.total ?? 0).toLocaleString(),
        label: "Total",
        icon: Layers,
      },
    ],
  };
}

export const portainerDefinition: ServiceDefinition<PortainerData> = {
  id: "portainer",
  name: "Portainer",
  icon: "portainer",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://portainer.example.org",
      helperText: "The base URL of your Portainer instance",
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
      placeholder: "Your Portainer password",
    },
    {
      key: "endpointId",
      label: "Environment ID",
      type: "text",
      required: false,
      placeholder: "1",
      helperText: "Portainer environment ID (default: 1)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const endpointId = config.endpointId ?? 1;

    // First, authenticate to get a JWT token
    const authRes = await fetchWithTimeout(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
    });

    if (!authRes.ok) {
      if (authRes.status === 400) throw new Error("Invalid username or password");
      if (authRes.status === 404) throw new Error("Portainer not found at this URL");
      throw new Error(`Portainer auth error: ${authRes.status}`);
    }

    const authData = await authRes.json();
    const token = authData.jwt;
    if (!token) throw new Error("Portainer auth succeeded but no JWT token returned");

    const headers = { Authorization: `Bearer ${token}` };

    // Fetch containers from configured endpoint (like Homepage)
    const containersRes = await fetchWithTimeout(
      `${baseUrl}/api/endpoints/${endpointId}/docker/containers/json?all=1`,
      { headers },
    );

    const containersData = containersRes.ok ? await containersRes.json() : [];

    const running = containersData.filter((c: { State: string }) => c.State === "running").length;
    const stopped = containersData.filter((c: { State: string }) => c.State === "exited").length;

    return {
      _status: "ok" as const,
      running,
      stopped,
      total: containersData.length,
    };
  },

  toPayload: portainerToPayload,
};
