"use server"

/**
 * Server-only utility for connecting to APC UPS via TCP daemon.
 * This file is marked as server-only to prevent Next.js from bundling
 * the Node.js `net` module for client components.
 */

import * as net from "net"

export async function fetchApcupsTcpStatus(
  host: string,
  port: number
): Promise<{
  loadPercent: number
  batteryCharge: number
  timeLeft: number
  temperature: number
  status: string
}> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error(`TCP connection to ${host}:${port} timed out`))
    }, 5000)

    const socket = net.createConnection({ host, port }, () => {
      socket.write("\n")
    })

    let data = ""

    socket.on("data", (chunk) => {
      data += chunk.toString()
    })

    socket.on("end", () => {
      clearTimeout(timeout)

      try {
        const extractValue = (key: string): string => {
          const regex = new RegExp(`${key}\\s*:\\s*([^\\n]+)`, "i")
          const match = data.match(regex)
          return match?.[1]?.trim() ?? ""
        }

        const loadPercent = parseFloat(extractValue("LOADPCT")) || 0
        const batteryCharge = parseFloat(extractValue("BCHARGE")) || 0
        const timeLeft = parseFloat(extractValue("TIMELEFT")) || 0
        const temperature = parseFloat(extractValue("ITEMP")) || 0
        const status = extractValue("STATUS") || "Unknown"

        resolve({
          loadPercent,
          batteryCharge,
          timeLeft,
          temperature,
          status,
        })
      } catch (error) {
        reject(
          new Error(
            `Failed to parse TCP response: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        )
      }
    })

    socket.on("error", (error) => {
      clearTimeout(timeout)
      reject(
        new Error(`TCP connection to ${host}:${port} failed: ${error.message}`)
      )
    })
  })
}
