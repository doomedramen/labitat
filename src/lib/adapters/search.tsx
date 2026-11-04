import { WebSearch } from "@/components/operator/web-search";
import type { ServiceDefinition } from "./types";

type SearchData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  engines: string;
};

export const searchDefinition: ServiceDefinition<SearchData> = {
  id: "search",
  name: "Search",
  icon: "search",
  category: "info",
  configFields: [
    {
      key: "engines",
      label: "Search Engines",
      type: "text",
      required: false,
      placeholder: "Google, DuckDuckGo, Bing",
      helperText: "Comma-separated list of search engine names",
    },
  ],
  fetchData(config) {
    return Promise.resolve({
      _status: "ok",
      engines: config.engines || "Google,DuckDuckGo,Bing",
    });
  },
  renderWidget: WebSearch,
};
