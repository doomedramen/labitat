import { NextRequest } from "next/server"
import { pollingManager } from "@/lib/polling-manager"
import { serverCache } from "@/lib/server-cache"

export const dynamic = "force-dynamic"

const HEARTBEAT_INTERVAL_MS = 15_000
const MAX_CONNECTION_AGE_MS = 5 * 60 * 1000 // 5 minutes — forces client reconnect to pick up any code changes

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      pollingManager.connect()

      let closed = false

      const sendHeartbeat = () => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          closed = true
          clearInterval(heartbeat)
        }
      }

      // Periodic heartbeat to keep the connection alive through proxies
      const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

      // Max connection age — forces a clean reconnect periodically
      const maxAgeTimer = setTimeout(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "reconnect" })}\n\n`)
          )
        } catch {
          // stream already closed
        }
        closed = true
        clearInterval(heartbeat)
      }, MAX_CONNECTION_AGE_MS)

      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          closed = true
          clearInterval(heartbeat)
        }
      }

      // 1. Subscribe to cache updates FIRST — prevents the TOCTOU race where
      //    an update fires between the snapshot and the subscription.
      const sentIds = new Set<string>()
      const unsubscribe = serverCache.onUpdate(
        (itemId, widgetData, pingStatus) => {
          sentIds.add(itemId)
          send({
            type: "update",
            itemId,
            widgetData,
            pingStatus,
          })
        }
      )

      // 2. Register cleanup BEFORE the await so early disconnect is handled
      request.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(heartbeat)
        clearTimeout(maxAgeTimer)
        unsubscribe()
        pollingManager.disconnect()
        controller.close()
      })

      // 3. Wait for the first poll cycle to complete so the cache is
      //    populated before we send the snapshot. This prevents a flash
      //    of empty data on page load. Cap the wait at 5 s so a single
      //    slow service doesn't block the entire stream.
      await Promise.race([
        pollingManager.waitForFirstPoll(),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ])

      // 4. Then send the current cache snapshot. Any item that already fired
      //    via the listener above will be skipped (sentIds guard).
      for (const [id, data] of serverCache.getAll()) {
        if (!sentIds.has(id)) {
          send({
            type: "update",
            itemId: id,
            widgetData: data.widgetData,
            pingStatus: data.pingStatus,
          })
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
