import { describe, it, expect } from "vitest"
import { dataToStatus } from "@/lib/adapters/types"
import type { ServiceData } from "@/lib/adapters/types"

describe("dataToStatus", () => {
  it("returns unknown for missing status", () => {
    const data: ServiceData = {}
    expect(dataToStatus(data)).toEqual({ state: "unknown" })
  })

  it("returns unknown for 'none' status", () => {
    const data: ServiceData = { _status: "none" }
    expect(dataToStatus(data)).toEqual({ state: "unknown" })
  })

  it("returns healthy for 'ok' status", () => {
    const data: ServiceData = { _status: "ok" }
    expect(dataToStatus(data)).toEqual({ state: "healthy" })
  })

  it("returns healthy for 'warn' status", () => {
    const data: ServiceData = { _status: "warn" }
    expect(dataToStatus(data)).toEqual({ state: "healthy" })
  })

  it("returns error for 'error' status with message", () => {
    const data: ServiceData = {
      _status: "error",
      _statusText: "Connection refused",
    }
    expect(dataToStatus(data)).toEqual({
      state: "error",
      reason: "Connection refused",
    })
  })

  it("returns error with default message when no statusText", () => {
    const data: ServiceData = { _status: "error" }
    expect(dataToStatus(data)).toEqual({
      state: "error",
      reason: "Service error",
    })
  })
})
