export const dynamic = "force-dynamic"

export async function GET() {
  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("data: ok\n\n"))
      intervalId = setInterval(() => {
        controller.enqueue(encoder.encode("data: ok\n\n"))
      }, 5_000)
    },
    cancel() {
      clearInterval(intervalId)
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
