"use server";

/**
 * Server-only utility for connecting to a NUT (Network UPS Tools) `upsd` daemon
 * via the network protocol (default port 3493).
 * This file is marked as server-only to prevent Next.js from bundling
 * the Node.js `net` module for client components.
 */

import * as net from "net";

export type NutTcpStatus = {
  status: string;
  batteryCharge: number;
  runtimeSeconds: number;
  loadPercent: number;
};

export async function fetchNutTcpStatus(
  host: string,
  port: number,
  upsName: string,
  username?: string,
  password?: string,
): Promise<NutTcpStatus> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      fn();
    };

    const timeout = setTimeout(() => {
      settle(() => reject(new Error(`TCP connection to ${host}:${port} timed out`)));
    }, 5000);

    // Plain-text, newline-terminated NUT wire protocol.
    // Stages:
    //  - "auth-username": waiting for OK reply to `USERNAME <user>`
    //  - "auth-password": waiting for OK reply to `PASSWORD <pass>`
    //  - "list": waiting for `BEGIN LIST VAR <upsname>`
    //  - "vars": collecting `VAR <upsname> <varname> "<value>"` lines until `END LIST VAR <upsname>`
    let stage: "auth-username" | "auth-password" | "list" | "vars" = username
      ? "auth-username"
      : "list";

    const vars: Record<string, string> = {};
    let buffer = "";

    const socket = net.createConnection({ host, port }, () => {
      if (username) {
        socket.write(`USERNAME ${username}\n`);
      } else {
        socket.write(`LIST VAR ${upsName}\n`);
      }
    });

    socket.on("data", (chunk: Buffer | string) => {
      buffer += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line) continue;

        if (line.startsWith("ERR")) {
          settle(() => reject(new Error(`NUT server error: ${line}`)));
          return;
        }

        if (stage === "auth-username") {
          if (line === "OK") {
            stage = "auth-password";
            socket.write(`PASSWORD ${password ?? ""}\n`);
          }
          continue;
        }

        if (stage === "auth-password") {
          if (line === "OK") {
            stage = "list";
            socket.write(`LIST VAR ${upsName}\n`);
          }
          continue;
        }

        if (stage === "list") {
          if (line.startsWith("BEGIN LIST VAR")) {
            stage = "vars";
          }
          continue;
        }

        // stage === "vars"
        if (line.startsWith("END LIST VAR")) {
          settle(() =>
            resolve({
              status: vars["ups.status"] ?? "Unknown",
              batteryCharge: parseFloat(vars["battery.charge"]) || 0,
              runtimeSeconds: parseFloat(vars["battery.runtime"]) || 0,
              loadPercent: parseFloat(vars["ups.load"]) || 0,
            }),
          );
          return;
        }

        const match = line.match(/^VAR\s+\S+\s+(\S+)\s+"([^"]*)"/);
        if (match) {
          vars[match[1]] = match[2];
        }
      }
    });

    socket.on("end", () => {
      settle(() => reject(new Error("Connection closed before END LIST VAR received")));
    });

    socket.on("error", (error) => {
      settle(() => reject(new Error(`TCP connection to ${host}:${port} failed: ${error.message}`)));
    });
  });
}
