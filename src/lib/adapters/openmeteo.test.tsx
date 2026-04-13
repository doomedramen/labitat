import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openmeteoDefinition } from "@/lib/adapters/openmeteo";

describe("openmeteo definition", () => {
  it("has correct metadata", () => {
    expect(openmeteoDefinition.id).toBe("openmeteo");
    expect(openmeteoDefinition.name).toBe("Open-Meteo Weather");
    expect(openmeteoDefinition.icon).toBe("openmeteo");
    expect(openmeteoDefinition.category).toBe("info");
    expect(openmeteoDefinition.defaultPollingMs).toBe(30_000);
  });

  it("has configFields defined", () => {
    expect(openmeteoDefinition.configFields).toBeDefined();
    expect(openmeteoDefinition.configFields).toHaveLength(2);
    expect(openmeteoDefinition.configFields[0].key).toBe("latitude");
    expect(openmeteoDefinition.configFields[0].type).toBe("number");
    expect(openmeteoDefinition.configFields[0].required).toBe(true);
    expect(openmeteoDefinition.configFields[1].key).toBe("longitude");
    expect(openmeteoDefinition.configFields[1].type).toBe("number");
    expect(openmeteoDefinition.configFields[1].required).toBe(true);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 22.5,
                relative_humidity_2m: 65.3,
                weather_code: 2,
                wind_speed_10m: 15.7,
                is_day: 1,
              },
            }),
        }),
      );

      const result = await openmeteoDefinition.fetchData!({
        latitude: "51.5074",
        longitude: "-0.1278",
      });

      expect(result._status).toBe("ok");
      expect(result.temperature).toBe(23);
      expect(result.humidity).toBe(65);
      expect(result.windSpeed).toBe(16);
      expect(result.weatherCode).toBe(2);
      expect(result.isDay).toBe(true);
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }));

      await expect(
        openmeteoDefinition.fetchData!({
          latitude: "51.5074",
          longitude: "-0.1278",
        }),
      ).rejects.toThrow("Open-Meteo error: 500");
    });

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await openmeteoDefinition.fetchData!({
        latitude: "51.5074",
        longitude: "-0.1278",
      });

      expect(result.temperature).toBe(0);
      expect(result.humidity).toBe(0);
      expect(result.windSpeed).toBe(0);
      expect(result.weatherCode).toBe(0);
      expect(result.isDay).toBe(false);
    });

    it("handles is_day === 0 as night", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 10,
                relative_humidity_2m: 80,
                weather_code: 0,
                wind_speed_10m: 5,
                is_day: 0,
              },
            }),
        }),
      );

      const result = await openmeteoDefinition.fetchData!({
        latitude: "51.5074",
        longitude: "-0.1278",
      });

      expect(result.isDay).toBe(false);
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats (daytime)", () => {
      const payload = openmeteoDefinition.toPayload!({
        _status: "ok",
        temperature: 23,
        humidity: 65,
        windSpeed: 16,
        weatherCode: 2,
        isDay: true,
      });
      expect(payload.stats).toHaveLength(4);
      expect(payload.stats[0].value).toBe("23°C");
      expect(payload.stats[0].label).toBe("Temp");
      expect(payload.stats[1].value).toBe("65%");
      expect(payload.stats[1].label).toBe("Humidity");
      expect(payload.stats[2].value).toBe("16 km/h");
      expect(payload.stats[2].label).toBe("Wind");
      expect(payload.stats[3].value).toBe("☀️");
      expect(payload.stats[3].label).toBe("Partly cloudy");
    });

    it("converts nighttime data", () => {
      const payload = openmeteoDefinition.toPayload!({
        _status: "ok",
        temperature: 10,
        humidity: 80,
        windSpeed: 5,
        weatherCode: 0,
        isDay: false,
      });
      expect(payload.stats[3].value).toBe("🌙");
      expect(payload.stats[3].label).toBe("Clear sky");
    });

    it("shows Unknown for unknown weather code", () => {
      const payload = openmeteoDefinition.toPayload!({
        _status: "ok",
        temperature: 15,
        humidity: 50,
        windSpeed: 10,
        weatherCode: 999,
        isDay: true,
      });
      expect(payload.stats[3].label).toBe("Unknown");
    });
  });
});
