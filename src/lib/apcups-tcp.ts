"use server";

/**
 * Server-only utility for connecting to APC UPS via TCP daemon.
 * This file is marked as server-only to prevent Next.js from bundling
 * the Node.js `net` module for client components.
 */

import * as net from "net";

export async function fetchApcupsTcpStatus(
  host: string,
  port: number,
): Promise<{
  loadPercent: number;
  batteryCharge: number;
  timeLeft: number;
  status: string;
}> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TCP connection to ${host}:${port} timed out`));
    }, 5000);

    const socket = net.createConnection({ host, port }, () => {
      // apcupsd NIS protocol: 2-byte length prefix + command
      // "status" command is 6 bytes -> [0, 6, 's', 't', 'a', 't', 'u', 's']
      const buffer = Buffer.alloc(8);
      buffer.writeUInt16BE(6, 0);
      buffer.write("status", 2);
      socket.write(buffer);
    });

    let data = "";
    let chunkBuffer = Buffer.alloc(0);

    socket.on("data", (chunk: Buffer | string) => {
      const chunkAsBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunkBuffer = Buffer.concat([chunkBuffer, chunkAsBuffer]);

      // Process all complete packets in the buffer
      while (chunkBuffer.length >= 2) {
        const len = chunkBuffer.readUInt16BE(0);
        if (len === 0) {
          // End of message marker
          socket.end();
          break;
        }

        if (chunkBuffer.length < 2 + len) {
          // Incomplete packet, wait for more data
          break;
        }

        // Extract the packet content (skipping the 2-byte length)
        data += chunkBuffer.toString("utf8", 2, 2 + len);
        chunkBuffer = chunkBuffer.subarray(2 + len);
      }
    });

    socket.on("end", () => {
      clearTimeout(timeout);
      socket.destroy(); // Ensure socket is closed

      if (!data) {
        reject(new Error("No data received from APC UPS"));
        return;
      }

      try {
        const extractValue = (key: string): string => {
          const regex = new RegExp(`${key}\\s*:\\s*([^\\n]+)`, "i");
          const match = data.match(regex);
          return match?.[1]?.trim() ?? "";
        };

        const loadPercent = parseFloat(extractValue("LOADPCT")) || 0;
        const batteryCharge = parseFloat(extractValue("BCHARGE")) || 0;
        const timeLeft = parseFloat(extractValue("TIMELEFT")) || 0;
        const status = extractValue("STATUS") || "Unknown";

        resolve({
          loadPercent,
          batteryCharge,
          timeLeft,
          status,
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to parse TCP response: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`TCP connection to ${host}:${port} failed: ${error.message}`));
    });
  });
}
