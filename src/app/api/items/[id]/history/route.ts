import { readHistory } from "@/lib/history-store";
import { HISTORY_RANGES, type HistoryRange } from "@/lib/history-types";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const range = search.get("range") ?? "1h";
  const metric = search.get("metric");
  const headers = { "Cache-Control": "no-store" };
  if (
    !Object.hasOwn(HISTORY_RANGES, range) ||
    (metric !== null && !/^[a-zA-Z0-9_.-]{1,128}$/.test(metric))
  )
    return Response.json({ error: "Invalid history query" }, { status: 400, headers });
  const history = readHistory(id, metric, range as HistoryRange);
  return history
    ? Response.json(history, { headers })
    : Response.json({ error: "Service not found" }, { status: 404, headers });
}
