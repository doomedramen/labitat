/**
 * Example tests demonstrating the new adapter mock utilities.
 * These tests show how to use the centralized mock system
 * instead of manually mocking fetch responses.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { radarrDefinition } from "@/lib/adapters/radarr"
import { sonarrDefinition } from "@/lib/adapters/sonarr"
import { adguardDefinition } from "@/lib/adapters/adguard"
import { sabnzbdDefinition } from "@/lib/adapters/sabnzbd"
import { plexDefinition } from "@/lib/adapters/plex"
import {
  createMockAdapter,
  withMockAdapter,
  mocks,
  getMocksForAdapter,
  setupMultipleMocks,
  type MockAdapter,
} from "../../../tests/helpers/mocks"

describe("adapter mock utilities - examples", () => {
  describe("withMockAdapter - automatic setup/teardown", () => {
    it("fetches radarr data with default mocks", async () => {
      await withMockAdapter(mocks.radarr.success(), async () => {
        const result = await radarrDefinition.fetchData!({
          url: "https://radarr.example.com",
          apiKey: "test-key",
        })

        expect(result._status).toBe("ok")
        expect(result.queued).toBe(5)
        expect(result.missing).toBe(3)
        expect(result.wanted).toBe(7)
        expect(result.movies).toBe(10)
      })
    })

    it("fetches radarr data with custom options", async () => {
      await withMockAdapter(
        mocks.radarr.success("https://radarr.example.com", {
          queued: 15,
          missing: 8,
          wanted: 12,
          movies: 100,
        }),
        async () => {
          const result = await radarrDefinition.fetchData!({
            url: "https://radarr.example.com",
            apiKey: "test-key",
          })

          expect(result.queued).toBe(15)
          expect(result.missing).toBe(8)
          expect(result.wanted).toBe(12)
          expect(result.movies).toBe(100)
        }
      )
    })

    it("handles empty state", async () => {
      await withMockAdapter(mocks.radarr.empty(), async () => {
        const result = await radarrDefinition.fetchData!({
          url: "https://radarr.example.com",
          apiKey: "test-key",
        })

        expect(result.queued).toBe(0)
        expect(result.missing).toBe(0)
        expect(result.wanted).toBe(0)
        expect(result.movies).toBe(0)
      })
    })

    it("handles error responses", async () => {
      await withMockAdapter(
        mocks.radarr.error("https://radarr.example.com", 500),
        async () => {
          await expect(
            radarrDefinition.fetchData!({
              url: "https://radarr.example.com",
              apiKey: "bad-key",
            })
          ).rejects.toThrow("Radarr error: 500")
        }
      )
    })

    it("handles unauthorized responses", async () => {
      await withMockAdapter(
        mocks.radarr.unauthorized("https://radarr.example.com"),
        async () => {
          await expect(
            radarrDefinition.fetchData!({
              url: "https://radarr.example.com",
              apiKey: "invalid-key",
            })
          ).rejects.toThrow()
        }
      )
    })
  })

  describe("createMockAdapter - manual control", () => {
    let mockAdapter: MockAdapter

    beforeEach(() => {
      mockAdapter = createMockAdapter()
    })

    afterEach(() => {
      mockAdapter.teardown()
    })

    it("fetches radarr with active downloads", async () => {
      const futureTime = new Date(Date.now() + 45 * 60 * 1000).toISOString()
      mockAdapter.setup(
        ...mocks.radarr.success("https://radarr.example.com", {
          queued: 3,
          downloads: [
            {
              title: "The Matrix (1999)",
              size: 2147483648,
              sizeleft: 1073741824,
              estimatedCompletionTime: futureTime,
              trackedDownloadState: "downloading",
            },
          ],
        })
      )

      const result = await radarrDefinition.fetchData!({
        url: "https://radarr.example.com",
        apiKey: "test-key",
        showActiveDownloads: "true",
      })

      expect(result.downloads).toHaveLength(1)
      expect(result.downloads![0].title).toBe("The Matrix (1999)")
      expect(result.downloads![0].progress).toBe(50)
      expect(result.downloads![0].activity).toBe("Downloading")
      expect(result.downloads![0].size).toBe("2.0 GB")
    })

    it("records all requests made", async () => {
      mockAdapter.setup(...mocks.radarr.success())

      await radarrDefinition.fetchData!({
        url: "https://radarr.example.com",
        apiKey: "test-key",
      })

      const requests = mockAdapter.getRequests()
      expect(requests).toHaveLength(4)
      expect(requests[0].url).toContain("/api/v3/queue")
      expect(requests[0].method).toBe("GET")
      expect(requests[0].headers).toEqual({
        "X-Api-Key": "test-key",
      })
    })

    it("can clear recorded requests", async () => {
      mockAdapter.setup(...mocks.radarr.success())

      // Make some requests
      await radarrDefinition.fetchData!({
        url: "https://radarr.example.com",
        apiKey: "test-key",
      })

      expect(mockAdapter.getRequests()).toHaveLength(4)

      // Clear and verify
      mockAdapter.clearRequests()
      expect(mockAdapter.getRequests()).toHaveLength(0)
    })
  })

  describe("getMocksForAdapter - dynamic mock retrieval", () => {
    it("gets success mocks for radarr", async () => {
      const mockResponses = getMocksForAdapter(
        "radarr",
        "success",
        "https://radarr.test",
        { queued: 20, movies: 200 }
      )

      await withMockAdapter(mockResponses, async () => {
        const result = await radarrDefinition.fetchData!({
          url: "https://radarr.test",
          apiKey: "test-key",
        })

        expect(result.queued).toBe(20)
        expect(result.movies).toBe(200)
      })
    })

    it("gets error mocks for sonarr", async () => {
      const mockResponses = getMocksForAdapter(
        "sonarr",
        "error",
        "https://sonarr.test",
        undefined
      )

      await withMockAdapter(mockResponses, async () => {
        await expect(
          sonarrDefinition.fetchData!({
            url: "https://sonarr.test",
            apiKey: "bad-key",
          })
        ).rejects.toThrow()
      })
    })
  })

  describe("setupMultipleMocks - multi-adapter testing", () => {
    let mockAdapter: MockAdapter

    beforeEach(() => {
      mockAdapter = createMockAdapter()
    })

    afterEach(() => {
      mockAdapter.teardown()
    })

    it("sets up mocks for multiple adapters", async () => {
      setupMultipleMocks(mockAdapter, [
        {
          adapterId: "radarr",
          state: "success",
          baseUrl: "https://radarr.test",
          options: { queued: 5, movies: 50 },
        },
        {
          adapterId: "sonarr",
          state: "success",
          baseUrl: "https://sonarr.test",
          options: { queued: 3, series: 15 },
        },
      ])

      // Test Radarr
      const radarrResult = await radarrDefinition.fetchData!({
        url: "https://radarr.test",
        apiKey: "test-key",
      })
      expect(radarrResult.queued).toBe(5)
      expect(radarrResult.movies).toBe(50)

      // Test Sonarr
      const sonarResult = await sonarrDefinition.fetchData!({
        url: "https://sonarr.test",
        apiKey: "test-key",
      })
      expect(sonarResult.queued).toBe(3)
      expect(sonarResult.series).toBe(15)
    })
  })

  describe("real-world scenarios", () => {
    it("simulates dashboard with multiple widgets", async () => {
      const mockAdapter = createMockAdapter()

      setupMultipleMocks(mockAdapter, [
        {
          adapterId: "radarr",
          baseUrl: "https://radarr.test",
          options: { queued: 5, movies: 100 },
        },
        {
          adapterId: "sonarr",
          baseUrl: "https://sonarr.test",
          options: { queued: 3, series: 50 },
        },
        {
          adapterId: "plex",
          baseUrl: "https://plex.test",
          options: { streams: 2, movies: 200 },
        },
        {
          adapterId: "adguard",
          baseUrl: "https://adguard.test",
          options: { queries: 10000, blocked: 1500 },
        },
      ])

      // Simulate fetching data for all widgets
      const [radarr, sonarr, plex, adguard] = await Promise.all([
        radarrDefinition.fetchData!({
          url: "https://radarr.test",
          apiKey: "key1",
        }),
        sonarrDefinition.fetchData!({
          url: "https://sonarr.test",
          apiKey: "key2",
        }),
        plexDefinition.fetchData!({
          url: "https://plex.test",
          token: "token1",
        }),
        adguardDefinition.fetchData!({
          url: "https://adguard.test",
          username: "admin",
          password: "password",
        }),
      ])

      expect(radarr.queued).toBe(5)
      expect(sonarr.queued).toBe(3)
      expect(plex.streams).toBe(2)
      expect(adguard.queries).toBe(10000)

      mockAdapter.teardown()
    })

    it("handles partial failures", async () => {
      const mockAdapter = createMockAdapter()

      // Radarr succeeds, Sonarr fails
      mockAdapter.setup(
        ...mocks.radarr.success("https://radarr.test", { queued: 5 }),
        ...mocks.sonarr.error("https://sonarr.test", 500)
      )

      const radarrResult = await radarrDefinition.fetchData!({
        url: "https://radarr.test",
        apiKey: "key1",
      })
      expect(radarrResult.queued).toBe(5)

      await expect(
        sonarrDefinition.fetchData!({
          url: "https://sonarr.test",
          apiKey: "key2",
        })
      ).rejects.toThrow("Sonarr error: 500")

      mockAdapter.teardown()
    })

    it("tests with active downloads across multiple adapters", async () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const mockAdapter = createMockAdapter()

      mockAdapter.setup(
        ...mocks.radarr.success("https://radarr.test", {
          downloads: [
            {
              title: "The Matrix (1999)",
              size: 2147483648,
              sizeleft: 1073741824,
              estimatedCompletionTime: futureTime,
              trackedDownloadState: "downloading",
            },
          ],
        }),
        ...mocks.sonarr.success("https://sonarr.test", {
          downloads: [
            {
              title: "S01E05 - Test Episode",
              seriesTitle: "Test Series",
              episodeTitle: "Test Episode",
              size: 1073741824,
              sizeleft: 536870912,
              trackedDownloadState: "downloading",
            },
          ],
        }),
        ...mocks.sabnzbd.success("https://sabnzbd.test", {
          speed: "15.5 MB/s",
          timeleft: "00:10:00",
          queueSize: 3,
          downloading: true,
          slots: [
            {
              filename: "TestFile.iso",
              percentage: 50,
              timeleft: "00:10:00",
              mb: "2048",
            },
          ],
        })
      )

      const [radarr, sonarr, sabnzbd] = await Promise.all([
        radarrDefinition.fetchData!({
          url: "https://radarr.test",
          apiKey: "key1",
          showActiveDownloads: "true",
        }),
        sonarrDefinition.fetchData!({
          url: "https://sonarr.test",
          apiKey: "key2",
          showActiveDownloads: "true",
        }),
        sabnzbdDefinition.fetchData!({
          url: "https://sabnzbd.test",
          apiKey: "key3",
          showDownloads: "true",
        }),
      ])

      expect(radarr.downloads).toHaveLength(1)
      expect(sonarr.downloads).toHaveLength(1)
      expect(sabnzbd.downloads).toHaveLength(1)
      expect(sabnzbd.speed).toBe("15.5 MB/s")

      mockAdapter.teardown()
    })
  })
})
