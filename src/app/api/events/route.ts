import { NextRequest } from "next/server";
import { pollingSup } from "@/lib/polling-supervisor";
import { serverCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_CONNECTION_AGE_MS = 5 * 60 * 1000; // 5 minutes — forces client reconnect

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      let heartbeat: ReturnType<typeof setInterval>;
      let maxAgeTimer: ReturnType<typeof setTimeout>;
      let unsubscribe = () => {};
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(maxAgeTimer);
        unsubscribe();
        request.signal.removeEventListener("abort", cleanup);
        pollingSup.disconnect();
        try {
          controller.close();
        } catch {
          /* consumer may have cancelled */
        }
      };

      const wasIdle = pollingSup.getConnectionCount() === 0;
      pollingSup.connect();

      // If no clients were connected, trigger immediate poll to freshen cache.
      // The client will receive updates via SSE as polling completes.
      if (wasIdle) {
        pollingSup.pollNow().catch((err) => {
          console.error("[events] Immediate poll failed:", err);
        });
      }

      const sendHeartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      };

      heartbeat = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

      maxAgeTimer = setTimeout(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reconnect" })}\n\n`));
        } catch {
          // stream already closed
        }
        cleanup();
      }, MAX_CONNECTION_AGE_MS);

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      // Subscribe to cache updates
      unsubscribe = serverCache.onUpdate((itemId, widgetData, pingStatus) => {
        send({
          type: "update",
          itemId,
          widgetData,
          pingStatus,
          fetchedAt: Date.now(),
        });
      });

      // Cleanup on disconnect
      request.signal.addEventListener("abort", cleanup, { once: true });
      if (request.signal.aborted) cleanup();
    },
    cancel() {
      cleanup();
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
