/** A group as the board sees it: how many stat cards and link chips it holds. */
export type BoardGroup = { id: string; cards: number; chips: number };

/** Columns a group would like: one per card, or roughly two chips per column. */
export function preferredSpan({ cards, chips }: BoardGroup, columns: number) {
  return Math.max(1, Math.min(columns, cards || Math.ceil(chips / 2)));
}

/**
 * How many board columns each group spans. Groups keep their saved order and are packed
 * into rows that use the full width: a group that does not fit the rest of a row shrinks
 * into it when it keeps at least half its preferred width (its cards wrap); otherwise it
 * starts the next row and the leftover columns widen earlier groups in that row (the
 * final row is left as it is).
 * A group widens only as far as its contents fill (one column per card, plus about one
 * per two chips), so no group is left with an empty strip.
 */
export function boardSpans(groups: BoardGroup[], columns: number): Record<string, number> {
  const spans: Record<string, number> = {};
  const want = (group: BoardGroup) => preferredSpan(group, columns);
  const room = (group: BoardGroup) =>
    Math.min(columns, group.cards + Math.ceil(group.chips / 2)) || 1;
  let row: BoardGroup[] = [];
  let left = columns;

  const closeRow = (last = false) => {
    // The final row may end short: widening it would only stretch the last group.
    for (const group of last ? [] : row) {
      if (!left) break;
      const extra = Math.min(left, room(group) - spans[group.id]);
      if (extra > 0) {
        spans[group.id] += extra;
        left -= extra;
      }
    }
    row = [];
    left = columns;
  };

  for (const group of groups) {
    const preferred = want(group);
    if (preferred > left && left < Math.ceil(preferred / 2)) closeRow();
    spans[group.id] = Math.min(preferred, left);
    left -= spans[group.id];
    row.push(group);
    if (!left) closeRow();
  }
  if (row.length) closeRow(true);
  return spans;
}
