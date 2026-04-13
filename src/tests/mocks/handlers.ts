import { http, HttpResponse } from "msw"

/**
 * Common request handlers for service adapter testing.
 * Add base mocks for Radarr, Sonarr, etc. here.
 */
export const handlers = [
  // Example: Mock Sonarr queue
  http.get("*/api/v3/queue", () => {
    return HttpResponse.json({
      totalRecords: 1,
      records: [
        {
          title: "Test Episode",
          size: 1024,
          sizeleft: 512,
          status: "downloading",
          trackedDownloadState: "downloading",
        },
      ],
    })
  }),

  // Example: Mock Plex identity
  http.get("*/identity", () => {
    return new HttpResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <MediaContainer size="0" machineIdentifier="test-machine-id">
      </MediaContainer>`,
      { headers: { "Content-Type": "application/xml" } }
    )
  }),
]
