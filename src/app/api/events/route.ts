import { NextRequest } from "next/server"
import { pollingManager } from "@/lib/polling-manager"
import { serverCache } from "@/lib/server-cache"

export const dynamic = "force-dynamic"

const HEARTBEAT_INTERVAL_MS = 15_000

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
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

      // 2. Then send the current cache snapshot. Any item that already fired
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

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribe()
        pollingManager.disconnect()
        controller.close()
      })
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
