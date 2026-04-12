import { NextRequest } from "next/server"
import { pollingManager } from "@/lib/polling-manager"
import { serverCache } from "@/lib/server-cache"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Signal connection
      pollingManager.connect()

      const send = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // Stream closed
        }
      }

      // Send current cache state immediately
      for (const [id, data] of serverCache.getAll()) {
        send({
          type: "update",
          itemId: id,
          widgetData: data.widgetData,
          pingStatus: data.pingStatus,
        })
      }

      // Subscribe to cache updates
      const unsubscribe = serverCache.onUpdate(
        (itemId, widgetData, pingStatus) => {
          send({
            type: "update",
            itemId,
            widgetData,
            pingStatus,
          })
        }
      )

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
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
