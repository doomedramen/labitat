/**
 * Mock data for networking and monitoring adapters (AdGuard, Pi-hole, Glances, OpenMeteo, etc.)
 */

import type { MockResponse } from "../adapter-mocks"
import { successResponse, urlPatterns } from "../adapter-mocks"

// ── AdGuard Mocks ───────────────────────────────────────────────────────────────

export const adguardMocks = {
  success: (
    baseUrl = "https://adguard.example.com",
    opts?: {
      queries?: number
      blocked?: number
      parentalBlocked?: number
      safeSearchBlocked?: number
    }
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/control/stats"), {
      num_dns_queries: opts?.queries ?? 15234,
      num_blocked_filtering: opts?.blocked ?? 2345,
      num_blocked_parental: opts?.parentalBlocked ?? 120,
      num_blocked_safe_search: opts?.safeSearchBlocked ?? 45,
    }),
  ],

  empty: (baseUrl = "https://adguard.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/control/stats"), {
      num_dns_queries: 0,
      num_blocked_filtering: 0,
      num_blocked_parental: 0,
      num_blocked_safe_search: 0,
    }),
  ],

  error: (
    baseUrl = "https://adguard.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/control/stats"),
      { error: `AdGuard error: ${status}` },
      status
    ),

  unauthorized: (baseUrl = "https://adguard.example.com"): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/control/stats"),
      { error: "Unauthorized" },
      401
    ),
}

// ── Pi-hole Mocks ───────────────────────────────────────────────────────────────

export const piholeMocks = {
  success: (
    baseUrl = "https://pihole.example.com",
    opts?: {
      queries?: number
      blocked?: number
      percentage?: number
      domainsBeingBlocked?: number
    }
  ): MockResponse[] => [
    successResponse(
      urlPatterns.withQuery(baseUrl, "/admin/api.php", { summary: "true" }),
      {
        domains_being_blocked: opts?.domainsBeingBlocked ?? 125432,
        dns_queries_today: opts?.queries ?? 8765,
        ads_blocked_today: opts?.blocked ?? 1234,
        ads_percentage_today: opts?.percentage ?? 14.07,
        unique_domains: 3456,
        queries_forwarded: 5432,
        queries_cached: 2099,
        status: "enabled",
      }
    ),
  ],

  empty: (baseUrl = "https://pihole.example.com"): MockResponse[] => [
    successResponse(
      urlPatterns.withQuery(baseUrl, "/admin/api.php", { summary: "true" }),
      {
        domains_being_blocked: 0,
        dns_queries_today: 0,
        ads_blocked_today: 0,
        ads_percentage_today: 0,
        status: "enabled",
      }
    ),
  ],

  error: (baseUrl = "https://pihole.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.withQuery(baseUrl, "/admin/api.php", { summary: "true" }),
      { error: `Pi-hole error: ${status}` },
      status
    ),
}

// ── Glances Mocks ───────────────────────────────────────────────────────────────

export const glancesMocks = {
  success: (
    baseUrl = "https://glances.example.com",
    opts?: {
      cpuPercent?: number
      memPercent?: number
      memUsed?: number
      memTotal?: number
      load?: number[]
      diskReadRate?: number
      diskWriteRate?: number
      networkRx?: number
      networkTx?: number
    }
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/4/quicklook"), {
      cpu: opts?.cpuPercent ?? 45.2,
      mem: opts?.memPercent ?? 62.5,
      load: opts?.load ?? [1.2, 0.8, 0.5],
      percpu: [
        { cpu_number: 0, total: 50.0 },
        { cpu_number: 1, total: 40.0 },
      ],
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/4/mem"), {
      percent: opts?.memPercent ?? 62.5,
      used: opts?.memUsed ?? 8589934592,
      total: opts?.memTotal ?? 17179869184,
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/4/diskio"), {
      diskio: [
        {
          disk_name: "sda",
          read_bytes: opts?.diskReadRate ?? 1048576,
          write_bytes: opts?.diskWriteRate ?? 524288,
        },
      ],
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/4/network"), {
      network: [
        {
          interface_name: "eth0",
          bytes_recv: opts?.networkRx ?? 1073741824,
          bytes_sent: opts?.networkTx ?? 536870912,
        },
      ],
    }),
  ],

  empty: (baseUrl = "https://glances.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/4/quicklook"), {
      cpu: 0,
      mem: 0,
      load: [0, 0, 0],
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/4/mem"), {
      percent: 0,
      used: 0,
      total: 0,
    }),
  ],

  error: (
    baseUrl = "https://glances.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/4/quicklook"),
      { error: `Glances error: ${status}` },
      status
    ),
}

// ── OpenMeteo Mocks ─────────────────────────────────────────────────────────────

export const openmeteoMocks = {
  success: (opts?: {
    latitude?: number
    longitude?: number
    temperature?: number
    humidity?: number
    windSpeed?: number
    weatherCode?: number
  }): MockResponse[] => {
    const lat = opts?.latitude ?? 51.5074
    const lon = opts?.longitude ?? -0.1278

    return [
      successResponse(urlPatterns.contains("api.open-meteo.com"), {
        latitude: lat,
        longitude: lon,
        current: {
          temperature_2m: opts?.temperature ?? 18.5,
          relative_humidity_2m: opts?.humidity ?? 65,
          wind_speed_10m: opts?.windSpeed ?? 12.3,
          weather_code: opts?.weatherCode ?? 2, // Partly cloudy
        },
      }),
    ]
  },

  empty: (): MockResponse[] => [
    successResponse(urlPatterns.contains("api.open-meteo.com"), {
      latitude: 0,
      longitude: 0,
      current: {
        temperature_2m: 0,
        relative_humidity_2m: 0,
        wind_speed_10m: 0,
        weather_code: 0,
      },
    }),
  ],

  error: (status = 500): MockResponse =>
    successResponse(
      urlPatterns.contains("api.open-meteo.com"),
      { error: `OpenMeteo error: ${status}` },
      status
    ),
}

// ── OpenWeatherMap Mocks ────────────────────────────────────────────────────────

export const openweathermapMocks = {
  success: (opts?: {
    city?: string
    temperature?: number
    humidity?: number
    windSpeed?: number
    description?: string
  }): MockResponse[] => [
    successResponse(urlPatterns.contains("api.openweathermap.org"), {
      name: opts?.city ?? "London",
      main: {
        temp: opts?.temperature ?? 291.65, // 18.5°C in Kelvin
        humidity: opts?.humidity ?? 65,
      },
      wind: {
        speed: opts?.windSpeed ?? 3.6,
      },
      weather: [
        {
          description: opts?.description ?? "scattered clouds",
          icon: "03d",
        },
      ],
    }),
  ],

  empty: (): MockResponse[] => [
    successResponse(urlPatterns.contains("api.openweathermap.org"), {
      name: "Unknown",
      main: { temp: 0, humidity: 0 },
      wind: { speed: 0 },
      weather: [{ description: "unknown", icon: "01d" }],
    }),
  ],

  error: (status = 500): MockResponse =>
    successResponse(
      urlPatterns.contains("api.openweathermap.org"),
      { error: `OpenWeatherMap error: ${status}` },
      status
    ),

  unauthorized: (): MockResponse =>
    successResponse(
      urlPatterns.contains("api.openweathermap.org"),
      { message: "Invalid API key" },
      401
    ),
}

// ── UniFi Mocks ─────────────────────────────────────────────────────────────────

export const unifiMocks = {
  success: (
    baseUrl = "https://unifi.example.com",
    opts?: {
      wanBytes?: number
      lanBytes?: number
      wlanBytes?: number
      userCount?: number
      guestCount?: number
    }
  ): MockResponse[] => [
    // Login
    successResponse(urlPatterns.api(baseUrl, "/api/login"), {
      meta: { rc: "ok" },
    }),
    // Dashboard
    successResponse(urlPatterns.api(baseUrl, "/api/s/default/stat/dashboard"), {
      meta: { rc: "ok" },
      data: [
        {
          wan: { bytes: opts?.wanBytes ?? 1073741824 },
          lan: { bytes: opts?.lanBytes ?? 536870912 },
          wlan: { bytes: opts?.wlanBytes ?? 268435456 },
          user: { num_user: opts?.userCount ?? 25 },
          guest: { num_guest: opts?.guestCount ?? 5 },
        },
      ],
    }),
  ],

  empty: (baseUrl = "https://unifi.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/login"), {
      meta: { rc: "ok" },
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/s/default/stat/dashboard"), {
      meta: { rc: "ok" },
      data: [
        {
          wan: { bytes: 0 },
          lan: { bytes: 0 },
          wlan: { bytes: 0 },
          user: { num_user: 0 },
          guest: { num_guest: 0 },
        },
      ],
    }),
  ],

  error: (baseUrl = "https://unifi.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/login"),
      { meta: { rc: "error", msg: "Authentication failed" } },
      status
    ),
}

// ── APC UPS Mocks ───────────────────────────────────────────────────────────────

export const apcupsMocks = {
  success: (
    baseUrl = "https://apcups.example.com",
    opts?: {
      loadPercent?: number
      batteryCharge?: number
      timeLeft?: number
      voltage?: number
      temperature?: number
    }
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/status"), {
      loadpercent: opts?.loadPercent ?? 35.0,
      battery_charge: opts?.batteryCharge ?? 95.0,
      time_left: opts?.timeLeft ?? 1800,
      voltage: opts?.voltage ?? 230.0,
      temperature: opts?.temperature ?? 25.0,
      status: "ONLINE",
    }),
  ],

  empty: (baseUrl = "https://apcups.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/status"), {
      loadpercent: 0,
      battery_charge: 100,
      time_left: 3600,
      voltage: 230,
      temperature: 22,
      status: "ONLINE",
    }),
  ],

  error: (baseUrl = "https://apcups.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/status"),
      { error: `APC UPS error: ${status}` },
      status
    ),
}
