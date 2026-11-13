import type { ServiceDefinition } from "./types";
import { Download, Search, BookOpen } from "lucide-react";

type ReadarrData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  queued: number;
  wanted: number;
  books: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";
import { cachedLibraryCount } from "./library-count-cache";

function readarrToPayload(data: ReadarrData) {
  return {
    stats: [
      {
        id: "wanted",
        value: data.wanted,
        label: "Wanted",
        icon: Search,
      },
      {
        id: "queued",
        value: data.queued,
        label: "Queued",
        icon: Download,
      },
      {
        id: "books",
        value: data.books,
        label: "Books",
        icon: BookOpen,
      },
    ],
  };
}

export const readarrDefinition: ServiceDefinition<ReadarrData> = {
  id: "readarr",
  name: "Readarr",
  icon: "readarr",
  category: "downloads",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://readarr.example.org",
      helperText: "The base URL of your Readarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Readarr password or API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers = { "X-Api-Key": config.apiKey };

    const [bookCount, wantedRes, queueRes] = await Promise.all([
      cachedLibraryCount(`readarr:${baseUrl}:${config.apiKey}`, async () => {
        const res = await fetchWithTimeout(`${baseUrl}/api/v1/book`, { headers });
        if (res.status === 401) throw new Error("Invalid API key");
        if (res.status === 404) throw new Error("Readarr not found at this URL");
        if (!res.ok) throw new Error(`Readarr error: ${res.status}`);
        const data = await res.json();
        // Matches Homepage: count books where statistics.bookFileCount > 0
        return Array.isArray(data)
          ? data.filter(
              (book: { statistics?: { bookFileCount?: number } }) =>
                (book?.statistics?.bookFileCount ?? 0) > 0,
            ).length
          : 0;
      }),
      fetchWithTimeout(`${baseUrl}/api/v1/wanted/missing`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v1/queue/status`, { headers }),
    ]);

    const wantedData = wantedRes.ok ? await wantedRes.json() : { totalRecords: 0 };
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 };

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      wanted: wantedData.totalRecords ?? 0,
      books: bookCount,
    };
  },

  toPayload: readarrToPayload,
};
