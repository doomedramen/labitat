import type { ServiceDefinition } from "./types";
import { radarrDefinition } from "./radarr";
import { sonarrDefinition } from "./sonarr";

// Both application versions expose /api/v3; their library models differ.
export const whisparrDefinition: ServiceDefinition = {
  id: "whisparr",
  name: "Whisparr",
  icon: "whisparr",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    ...radarrDefinition.configFields.map((field) => ({
      ...field,
      placeholder: field.placeholder
        ?.replaceAll("radarr", "whisparr")
        .replaceAll("Radarr", "Whisparr"),
      helperText: field.helperText?.replaceAll("Radarr", "Whisparr"),
    })),
    {
      key: "version",
      label: "Whisparr version",
      type: "select",
      options: [
        { label: "V3 (scenes and movies)", value: "3" },
        { label: "V2 (studios)", value: "2" },
      ],
      helperText: "Defaults to V3. Select V2 for the studio-based version.",
    },
  ],
  async fetchData(config) {
    if (config.version && config.version !== "2" && config.version !== "3") {
      throw new Error("Whisparr version must be 2 or 3");
    }
    const adapter = config.version === "2" ? sonarrDefinition : radarrDefinition;
    try {
      return await adapter.fetchData!(config);
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") throw error;
      if (error instanceof Error) {
        throw new Error(
          error.message.replaceAll("Radarr", "Whisparr").replaceAll("Sonarr", "Whisparr"),
        );
      }
      throw error;
    }
  },
  toPayload(data) {
    if (
      !data ||
      !Number.isFinite(data.queued) ||
      !Number.isFinite(data.missing) ||
      !Number.isFinite(data.wanted)
    ) {
      return { stats: [], error: "Whisparr data is unavailable" };
    }

    if ("series" in data) {
      if (!Number.isFinite(data.series)) {
        return { stats: [], error: "Whisparr data is unavailable" };
      }
      return sonarrDefinition.toPayload!(
        data as Awaited<ReturnType<NonNullable<typeof sonarrDefinition.fetchData>>>,
      );
    }
    if (!Number.isFinite(data.movies)) {
      return { stats: [], error: "Whisparr data is unavailable" };
    }

    const payload = radarrDefinition.toPayload!(
      data as Awaited<ReturnType<NonNullable<typeof radarrDefinition.fetchData>>>,
    );
    return {
      ...payload,
      stats: payload.stats?.map((stat) =>
        stat.id === "movies" ? { ...stat, label: "Scenes / movies" } : stat,
      ),
    };
  },
};
