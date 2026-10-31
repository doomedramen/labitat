import type { ServiceDefinition } from "./types";
import { Film, Image, Images, Users, Building, Tags } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { validateResponse } from "./validate";

const fields = [
  ["scene_count", "Scenes", Film],
  ["image_count", "Images", Image],
  ["gallery_count", "Galleries", Images],
  ["performer_count", "Performers", Users],
  ["studio_count", "Studios", Building],
  ["tag_count", "Tags", Tags],
] as const;
type StashData = { _status: "ok"; counts: Record<string, number> };

export const stashDefinition: ServiceDefinition<StashData> = {
  id: "stash",
  name: "Stash",
  icon: "stash",
  category: "media",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://stash.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      helperText: "From Stash Settings → Security. Leave blank if authentication is disabled.",
    },
  ],
  async fetchData(config) {
    if (!config.url) throw new Error("Stash URL is required");
    const response = await fetchWithTimeout(`${config.url.replace(/\/+$/, "")}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { ApiKey: config.apiKey } : {}),
      },
      body: JSON.stringify({
        query: `query LabitatStats { stats { ${fields.map(([key]) => key).join(" ")} } }`,
      }),
    });
    if (!response.ok) throw new Error(`Stash error: ${response.status}`);
    const raw = await response.json();
    if (raw?.errors?.length)
      throw new Error("Stash GraphQL query failed; check API access and server version");
    const result = validateResponse<{ data: { stats: Record<string, number> } }>(
      raw,
      ["data"],
      fields.map(([key]) => ({ path: `data.stats.${key}`, type: "number" })),
      { adapter: "stash" },
    );
    for (const [key] of fields) {
      if (!Number.isSafeInteger(result.data.stats[key]) || result.data.stats[key] < 0)
        throw new Error(`Stash invalid count: ${key}`);
    }
    return { _status: "ok", counts: result.data.stats };
  },
  toPayload(data) {
    // Persisted widget data can outlive the adapter shape that produced it.
    // Treat an incompatible cache entry as unavailable instead of crashing SSR.
    if (
      !data ||
      typeof data.counts !== "object" ||
      data.counts === null ||
      fields.some(([id]) => !Number.isFinite(data.counts[id]))
    ) {
      return { stats: [], error: "Stash statistics are unavailable" };
    }

    return {
      stats: fields.map(([id, label, icon]) => ({ id, label, icon, value: data.counts[id] })),
    };
  },
};
