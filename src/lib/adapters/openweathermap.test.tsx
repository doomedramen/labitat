import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openweathermapDefinition } from "@/lib/adapters/openweathermap";

describe("openweathermap definition", () => {
  it("has correct metadata", () => {
    expect(openweathermapDefinition.id).toBe("openweathermap");
    expect(openweathermapDefinition.name).toBe("OpenWeatherMap");
    expect(openweathermapDefinition.icon).toBe("openweather");
    expect(openweathermapDefinition.category).toBe("info");
    expect(openweathermapDefinition.defaultPollingMs).toBe(30_000);
  });

  it("has configFields defined", () => {
    expect(openweathermapDefinition.configFields).toBeDefined();
    expect(openweathermapDefinition.configFields).toHaveLength(4);
    expect(openweathermapDefinition.configFields[0].key).toBe("apiKey");
    expect(openweathermapDefinition.configFields[0].type).toBe("password");
    expect(openweathermapDefinition.configFields[0].required).toBe(true);
    expect(openweathermapDefinition.configFields[1].key).toBe("latitude");
    expect(openweathermapDefinition.configFields[1].type).toBe("number");
    expect(openweathermapDefinition.configFields[1].required).toBe(true);
    expect(openweathermapDefinition.configFields[2].key).toBe("longitude");
    expect(openweathermapDefinition.configFields[2].type).toBe("number");
    expect(openweathermapDefinition.configFields[2].required).toBe(true);
    expect(openweathermapDefinition.configFields[3].key).toBe("units");
    expect(openweathermapDefinition.configFields[3].type).toBe("select");
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully in metric units", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              main: {
                temp: 22.5,
                humidity: 65,
                feels_like: 24.1,
              },
              wind: { speed: 5.5 },
              weather: [{ description: "scattered clouds" }],
            }),
        }),
      );

      const result = await openweathermapDefinition.fetchData!({
        apiKey: "test-key",
        latitude: "51.5074",
        longitude: "-0.1278",
        units: "metric",
      });

      expect(result._status).toBe("ok");
      expect(result.temperature).toBe(23);
      expect(result.humidity).toBe(65);
      expect(result.windSpeed).toBe(6);
      expect(result.feelsLike).toBe(24);
      expect(result.description).toBe("scattered clouds");
      expect(result.unitSymbol).toBe("°C");
      expect(result.speedUnit).toBe("m/s");
    });

    it("fetches data in imperial units", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              main: {
                temp: 72.5,
                humidity: 50,
                feels_like: 75,
              },
              wind: { speed: 10 },
              weather: [{ description: "clear sky" }],
            }),
        }),
      );

      const result = await openweathermapDefinition.fetchData!({
        apiKey: "test-key",
        latitude: "40.7128",
        longitude: "-74.0060",
        units: "imperial",
      });

      expect(result.temperature).toBe(73);
      expect(result.unitSymbol).toBe("°F");
      expect(result.speedUnit).toBe("mph");
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        openweathermapDefinition.fetchData!({
          apiKey: "bad-key",
          latitude: "51.5074",
          longitude: "-0.1278",
        }),
      ).rejects.toThrow("OpenWeatherMap error: 401");
    });

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await openweathermapDefinition.fetchData!({
        apiKey: "test-key",
        latitude: "51.5074",
        longitude: "-0.1278",
      });

      expect(result.temperature).toBe(0);
      expect(result.humidity).toBe(0);
      expect(result.windSpeed).toBe(0);
      expect(result.feelsLike).toBe(0);
      expect(result.description).toBe("Unknown");
    });

    it("uses metric as default units", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              main: { temp: 20, humidity: 60, feels_like: 21 },
              wind: { speed: 5 },
              weather: [{ description: "clear" }],
            }),
        }),
      );

      const result = await openweathermapDefinition.fetchData!({
        apiKey: "test-key",
        latitude: "51.5074",
        longitude: "-0.1278",
      });

      expect(result.unitSymbol).toBe("°C");
      expect(result.speedUnit).toBe("m/s");
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = openweathermapDefinition.toPayload!({
        _status: "ok",
        temperature: 23,
        humidity: 65,
        windSpeed: 6,
        description: "scattered clouds",
        feelsLike: 24,
        unitSymbol: "°C",
        speedUnit: "m/s",
      });
      expect(payload.stats).toHaveLength(5);
      expect(payload.stats[0].value).toBe("23°C");
      expect(payload.stats[0].label).toBe("Temp");
      expect(payload.stats[1].value).toBe("24°C");
      expect(payload.stats[1].label).toBe("Feels Like");
      expect(payload.stats[2].value).toBe("65%");
      expect(payload.stats[2].label).toBe("Humidity");
      expect(payload.stats[3].value).toBe("6 m/s");
      expect(payload.stats[3].label).toBe("Wind");
      expect(payload.stats[4].value).toBe("scattered clouds");
      expect(payload.stats[4].label).toBe("Condition");
    });

    it("handles imperial units", () => {
      const payload = openweathermapDefinition.toPayload!({
        _status: "ok",
        temperature: 73,
        humidity: 50,
        windSpeed: 10,
        description: "clear sky",
        feelsLike: 75,
        unitSymbol: "°F",
        speedUnit: "mph",
      });
      expect(payload.stats[0].value).toBe("73°F");
      expect(payload.stats[3].value).toBe("10 mph");
    });
  });
});
