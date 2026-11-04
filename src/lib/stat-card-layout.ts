/** Shared by view mode, previews, and the metric editor. */
export type StatCardOrder = { active: string[]; unused: string[] };

export function parseStatCardOrder(value: unknown): StatCardOrder | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !("active" in candidate) ||
    !("unused" in candidate)
  )
    return null;
  const { active, unused } = candidate;
  if (
    !Array.isArray(active) ||
    !Array.isArray(unused) ||
    ![...active, ...unused].every((id) => typeof id === "string")
  )
    return null;
  return { active, unused };
}

export function resolveStatCardLayout<T extends { id: string }>(
  items: T[],
  order: StatCardOrder | null,
  defaultActiveIds?: string[],
): { activeItems: T[]; unusedItems: T[] } {
  const byId = new Map(items.map((item) => [item.id, item]));
  const activeIds = [
    ...new Set(order ? order.active : (defaultActiveIds ?? items.map((item) => item.id))),
  ];
  const selected = order ? activeIds : activeIds.filter((id) => byId.has(id)).slice(0, 4);
  const activeItems = selected.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const active = new Set(selected);
  const unusedIds = [...new Set([...(order?.unused ?? []), ...items.map((item) => item.id)])];
  const unusedItems = unusedIds.flatMap((id) =>
    !active.has(id) && byId.has(id) ? [byId.get(id)!] : [],
  );
  return { activeItems, unusedItems };
}
