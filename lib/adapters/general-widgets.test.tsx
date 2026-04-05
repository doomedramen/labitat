import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { openmeteoDefinition } from "@/lib/adapters/openmeteo"
import { datetimeDefinition } from "@/lib/adapters/datetime"
import { glancesDefinition } from "@/lib/adapters/glances"
import { glancesTimeseriesDefinition } from "@/lib/adapters/glances-timeseries"
import { glancesPerCpuDefinition } from "@/lib/adapters/glances-percpu"
import { glancesProcessesDefinition } from "@/lib/adapters/glances-processes"
import { glancesSensorsDefinition } from "@/lib/adapters/glances-sensors"
import { logoDefinition } from "@/lib/adapters/logo"
import { openweathermapDefinition } from "@/lib/adapters/openweathermap"
import { searchDefinition } from "@/lib/adapters/search"
import { matrixDefinition } from "@/lib/adapters/matrix"
import { pipesDefinition } from "@/lib/adapters/pipes"

// Helper to test that a widget renders without crashing
function testWidgetRenders<TProps extends object>(
  definition: { Widget: React.ComponentType<TProps> },
  props = {} as TProps
) {
  expect(() => {
    render(React.createElement(definition.Widget, props))
  }).not.toThrow()
}

// Helper to test that specific text appears in the rendered output
function testWidgetRendersText<TProps extends object>(
  definition: { Widget: React.ComponentType<TProps> },
  props: TProps,
  expectedTexts: string[]
) {
  const { container } = render(React.createElement(definition.Widget, props))

  // Verify each expected text appears in the output
  for (const text of expectedTexts) {
    expect(container.textContent).toContain(text)
  }
}

describe("openmeteo adapter", () => {
  it("has correct definition", () => {
    expect(openmeteoDefinition.id).toBe("openmeteo")
    expect(openmeteoDefinition.name).toBe("OpenMeteo Weather")
    expect(openmeteoDefinition.category).toBe("info")
    expect(openmeteoDefinition.configFields).toHaveLength(2)
    expect(openmeteoDefinition.defaultPollingMs).toBe(60_000)
  })

  it("has required config fields", () => {
    const fields = openmeteoDefinition.configFields
    expect(
      fields.some((f) => f.key === "latitude" && f.type === "number")
    ).toBe(true)
    expect(
      fields.some((f) => f.key === "longitude" && f.type === "number")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      openmeteoDefinition,
      {
        temperature: 22.5,
        weatherCode: 0,
        weatherDescription: "Clear sky",
        windSpeed: 12.3,
        humidity: 65,
        isDay: 1,
      },
      ["22.5°C", "Clear sky", "12.3 km/h", "65"]
    )
  })
})

describe("datetime adapter", () => {
  it("has correct definition", () => {
    expect(datetimeDefinition.id).toBe("datetime")
    expect(datetimeDefinition.name).toBe("Date & Time")
    expect(datetimeDefinition.category).toBe("info")
    expect(datetimeDefinition.configFields.length).toBeGreaterThanOrEqual(0)
    expect(datetimeDefinition.clientSide).toBe(true)
  })

  it("has config fields", () => {
    const fields = datetimeDefinition.configFields
    expect(fields.some((f) => f.key === "timeZone" && f.type === "text")).toBe(
      true
    )
  })

  it("renders widget", () => {
    testWidgetRenders(datetimeDefinition, {
      timeZone: "America/New_York",
      timeZoneOffset: "",
    })
  })
})

describe("glances adapter", () => {
  it("has correct definition", () => {
    expect(glancesDefinition.id).toBe("glances")
    expect(glancesDefinition.name).toBe("Glances")
    expect(glancesDefinition.category).toBe("monitoring")
    expect(glancesDefinition.configFields.length).toBeGreaterThan(0)
    expect(glancesDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = glancesDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "password" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      glancesDefinition,
      {
        cpuPercent: 45.2,
        memoryPercent: 62.5,
        cpuTemp: 55.0,
        diskPercent: 75.3,
        uptime: 86400,
        load: [1.5, 1.2, 1.0],
        networkRx: 1000000,
        networkTx: 500000,
        showCpu: true,
        showMem: true,
        showCpuTemp: true,
        showUptime: true,
        showDisk: true,
        showNetwork: true,
        diskPath: "/",
      },
      ["45.2%", "CPU", "62.5%", "RAM", "55.0°C", "Temp", "75.3%", "Disk"]
    )
  })
})

describe("glances-timeseries adapter", () => {
  it("has correct definition", () => {
    expect(glancesTimeseriesDefinition.id).toBe("glances-timeseries")
    expect(glancesTimeseriesDefinition.name).toBe("Glances Time Series")
    expect(glancesTimeseriesDefinition.category).toBe("monitoring")
    expect(glancesTimeseriesDefinition.configFields.length).toBeGreaterThan(0)
    expect(glancesTimeseriesDefinition.defaultPollingMs).toBe(5_000)
  })

  it("has metric config field", () => {
    const fields = glancesTimeseriesDefinition.configFields
    expect(fields.some((f) => f.key === "metric" && f.type === "select")).toBe(
      true
    )
  })

  it("renders widget with cpu metric", () => {
    testWidgetRendersText(
      glancesTimeseriesDefinition,
      {
        metric: "cpu",
        value1: 45.2,
      },
      ["CPU"]
    )
  })

  it("renders widget with network metric", () => {
    testWidgetRendersText(
      glancesTimeseriesDefinition,
      {
        metric: "network",
        value1: 1000000,
        value2: 500000,
      },
      ["Rx", "Tx"]
    )
  })
})

describe("glances-percpu adapter", () => {
  it("has correct definition", () => {
    expect(glancesPerCpuDefinition.id).toBe("glances-percpu")
    expect(glancesPerCpuDefinition.name).toBe("Glances Per-Core CPU")
    expect(glancesPerCpuDefinition.category).toBe("monitoring")
    expect(glancesPerCpuDefinition.defaultPollingMs).toBe(5_000)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      glancesPerCpuDefinition,
      {
        cores: [
          { label: "C0", value: 45.2 },
          { label: "C1", value: 62.5 },
          { label: "C2", value: 30.1 },
          { label: "C3", value: 55.8 },
        ],
      },
      ["C0", "45%", "C1", "63%", "C2", "30%", "C3", "56%"]
    )
  })
})

describe("glances-processes adapter", () => {
  it("has correct definition", () => {
    expect(glancesProcessesDefinition.id).toBe("glances-processes")
    expect(glancesProcessesDefinition.name).toBe("Glances Processes")
    expect(glancesProcessesDefinition.category).toBe("monitoring")
    expect(glancesProcessesDefinition.configFields.length).toBeGreaterThan(0)
    expect(glancesProcessesDefinition.defaultPollingMs).toBe(10_000)
  })

  it("renders widget with data sorted by cpu", () => {
    testWidgetRendersText(
      glancesProcessesDefinition,
      {
        processes: [
          { name: "chrome", cpu: 25.5, mem: 15.2, pid: 1234 },
          { name: "firefox", cpu: 18.3, mem: 22.1, pid: 5678 },
          { name: "code", cpu: 12.1, mem: 10.5, pid: 9012 },
        ],
        sortBy: "cpu",
      },
      [
        "chrome",
        "25.5%",
        "15.2%",
        "firefox",
        "18.3%",
        "22.1%",
        "code",
        "12.1%",
        "10.5%",
      ]
    )
  })

  it("renders widget with data sorted by memory", () => {
    testWidgetRendersText(
      glancesProcessesDefinition,
      {
        processes: [
          { name: "chrome", cpu: 25.5, mem: 15.2, pid: 1234 },
          { name: "firefox", cpu: 18.3, mem: 22.1, pid: 5678 },
        ],
        sortBy: "memory",
      },
      ["chrome", "25.5%", "15.2%", "firefox", "18.3%", "22.1%"]
    )
  })
})

describe("glances-sensors adapter", () => {
  it("has correct definition", () => {
    expect(glancesSensorsDefinition.id).toBe("glances-sensors")
    expect(glancesSensorsDefinition.name).toBe("Glances Temperature Sensors")
    expect(glancesSensorsDefinition.category).toBe("monitoring")
    expect(glancesSensorsDefinition.configFields.length).toBeGreaterThan(0)
    expect(glancesSensorsDefinition.defaultPollingMs).toBe(15_000)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      glancesSensorsDefinition,
      {
        sensors: [
          { label: "Core 0", celsius: 55.2, max: 100 },
          { label: "Core 1", celsius: 58.5, max: 100 },
          { label: "CPU", celsius: 60.1, max: 105 },
        ],
      },
      ["55°", "Core 0", "59°", "Core 1", "60°", "CPU"]
    )
  })

  it("renders widget with no sensors", () => {
    testWidgetRendersText(
      glancesSensorsDefinition,
      {
        sensors: [],
      },
      ["No sensors"]
    )
  })
})

describe("logo adapter", () => {
  it("has correct definition", () => {
    expect(logoDefinition.id).toBe("logo")
    expect(logoDefinition.name).toBe("Logo")
    expect(logoDefinition.category).toBe("info")
    expect(logoDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(logoDefinition.defaultPollingMs).toBeUndefined()
  })

  it("has required config fields", () => {
    const fields = logoDefinition.configFields
    expect(fields.some((f) => f.key === "imageUrl" && f.type === "url")).toBe(
      true
    )
    expect(fields.some((f) => f.key === "linkUrl" && f.type === "url")).toBe(
      true
    )
    expect(fields.some((f) => f.key === "altText" && f.type === "text")).toBe(
      true
    )
  })

  it("renders widget with data", () => {
    const { container } = render(
      <logoDefinition.Widget
        imageUrl="https://example.com/logo.png"
        linkUrl="https://example.com"
        altText="Example Logo"
      />
    )
    // Logo widget renders an img with alt attribute
    const img = container.querySelector("img")
    expect(img?.getAttribute("alt")).toBe("Example Logo")
    expect(img?.getAttribute("src")).toBe("https://example.com/logo.png")
  })

  it("renders widget without link", () => {
    const { container } = render(
      <logoDefinition.Widget
        imageUrl="https://example.com/logo.png"
        altText="Example Logo"
      />
    )
    // Logo widget renders an img without a link
    const img = container.querySelector("img")
    expect(img?.getAttribute("alt")).toBe("Example Logo")
    expect(container.querySelector("a")).toBeNull()
  })
})

describe("openweathermap adapter", () => {
  it("has correct definition", () => {
    expect(openweathermapDefinition.id).toBe("openweathermap")
    expect(openweathermapDefinition.name).toBe("OpenWeatherMap")
    expect(openweathermapDefinition.category).toBe("info")
    expect(openweathermapDefinition.configFields.length).toBeGreaterThanOrEqual(
      3
    )
    expect(openweathermapDefinition.defaultPollingMs).toBe(60_000)
  })

  it("has required config fields", () => {
    const fields = openweathermapDefinition.configFields
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
    expect(
      fields.some((f) => f.key === "latitude" && f.type === "number")
    ).toBe(true)
    expect(
      fields.some((f) => f.key === "longitude" && f.type === "number")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      openweathermapDefinition,
      {
        temperature: 22.5,
        feelsLike: 24.0,
        weatherDescription: "Clear sky",
        weatherIcon: "01d",
        weatherMain: "Clear",
        humidity: 65,
        pressure: 1013,
        windSpeed: 3.6,
        cloudiness: 10,
      },
      ["22.5°C", "Feels like 24.0°C", "Clear sky", "65%", "1013", "3.6", "10%"]
    )
  })
})

describe("search adapter", () => {
  it("has correct definition", () => {
    expect(searchDefinition.id).toBe("search")
    expect(searchDefinition.name).toBe("Search")
    expect(searchDefinition.category).toBe("info")
    expect(searchDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(searchDefinition.defaultPollingMs).toBeUndefined()
  })

  it("has searchEngine config field", () => {
    const fields = searchDefinition.configFields
    const engineField = fields.find((f) => f.key === "searchEngine")
    expect(engineField).toBeDefined()
    expect(engineField?.type).toBe("select")
    expect(engineField?.options?.length).toBeGreaterThan(0)
  })

  it("renders widget with data", () => {
    const { container } = render(
      <searchDefinition.Widget
        searchEngine="google"
        searchUrl="https://www.google.com/search?q="
        placeholder="Search Google..."
      />
    )
    // Search widget renders an input with placeholder
    const input = container.querySelector("input[name='search']")
    expect(input?.getAttribute("placeholder")).toBe("Search Google...")
    // And a "Go" button
    expect(container.textContent).toContain("Go")
  })
})

describe("matrix adapter", () => {
  it("has correct definition", () => {
    expect(matrixDefinition.id).toBe("matrix")
    expect(matrixDefinition.name).toBe("Matrix Rain")
    expect(matrixDefinition.category).toBe("info")
    expect(matrixDefinition.configFields).toHaveLength(0)
    expect(matrixDefinition.clientSide).toBe(true)
    expect(matrixDefinition.defaultPollingMs).toBeUndefined()
  })

  it("renders widget", () => {
    testWidgetRenders(matrixDefinition)
  })
})

describe("pipes adapter", () => {
  it("has correct definition", () => {
    expect(pipesDefinition.id).toBe("pipes")
    expect(pipesDefinition.name).toBe("Pipes")
    expect(pipesDefinition.category).toBe("info")
    expect(pipesDefinition.configFields).toHaveLength(0)
    expect(pipesDefinition.clientSide).toBe(true)
    expect(pipesDefinition.defaultPollingMs).toBeUndefined()
  })

  it("renders widget", () => {
    testWidgetRenders(pipesDefinition)
  })
})
