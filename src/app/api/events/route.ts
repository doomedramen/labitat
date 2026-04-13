import { NextRequest } from "next/server";
import { pollingSup } from "@/lib/polling-supervisor";
import { serverCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_CONNECTION_AGE_MS = 5 * 60 * 1000; // 5 minutes — forces client reconnect

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      pollingSup.connect();

      let closed = false;

      const sendHeartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      };

      const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

      const maxAgeTimer = setTimeout(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reconnect" })}\n\n`));
        } catch {
          // stream already closed
        }
        closed = true;
        clearInterval(heartbeat);
      }, MAX_CONNECTION_AGE_MS);

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      };

      // Subscribe to cache updates
      const sentIds = new Set<string>();
      const unsubscribe = serverCache.onUpdate((itemId, widgetData, pingStatus) => {
        sentIds.add(itemId);
        send({
          type: "update",
          itemId,
          widgetData,
          pingStatus,
        });
      });

      // Cleanup on disconnect — registered before sending snapshot
      // so early disconnect is handled correctly
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(maxAgeTimer);
        unsubscribe();
        pollingSup.disconnect();
        controller.close();
      });

      // Send current cache snapshot. Items that update between
      // subscription and here are deduplicated via sentIds.
      for (const [id, data] of serverCache.getAll()) {
        if (!sentIds.has(id)) {
          send({
            type: "update",
            itemId: id,
            widgetData: data.widgetData,
            pingStatus: data.pingStatus,
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
