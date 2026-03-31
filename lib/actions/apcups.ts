"use server"

/**
 * Server action to fetch APC UPS data via TCP connection to apcupsd NIS server.
 * This is required because Node.js net module is not available in Next.js client components.
 */

import { Buffer } from "buffer"
import net from "net"

type ApcupsStatus = {
  STATUS: string
  LOADPCT: string
  BCHARGE: string
  TIMELEFT: string
  [key: string]: string
}

function parseResponse(buffer: Buffer): string[] {
  let ptr = 0
  const output: string[] = []
  while (ptr < buffer.length) {
    const lineLen = buffer.readUInt16BE(ptr)
    const asciiData = buffer.toString("ascii", ptr + 2, lineLen + ptr + 2)
    output.push(asciiData)
    ptr += 2 + lineLen
  }
  return output
}

function statusAsJSON(statusOutput: string[]): ApcupsStatus {
  return statusOutput.reduce((output, line) => {
    if (!line || line.startsWith("END APC")) return output
    const [key, value] = line.trim().split(":")
    const newOutput = { ...output }
    newOutput[key.trim()] = value?.trim() ?? ""
    return newOutput
  }, {} as ApcupsStatus)
}

export async function getApcupsStatus(
  host: string,
  port: number
): Promise<ApcupsStatus> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(5000)
    socket.connect({ host, port })

    const response: Buffer[] = []

    socket.on("connect", () => {
      const CMD = "status"
      const buffer = Buffer.alloc(CMD.length + 2)
      buffer.writeUInt16BE(CMD.length, 0)
      buffer.write(CMD, 2)
      socket.write(buffer)
    })

    socket.on("data", (data: Buffer) => {
      response.push(data)

      if (data.readUInt16BE(data.length - 2) === 0) {
        try {
          const buffer = Buffer.concat(response)
          const output = parseResponse(buffer)
          resolve(statusAsJSON(output))
          socket.end()
        } catch (e) {
          reject(e)
        }
      }
    })

    socket.on("error", (err: Error) => {
      socket.destroy()
      reject(err)
    })
    socket.on("timeout", () => {
      socket.destroy()
      reject(new Error("socket timeout"))
    })
  })
}
