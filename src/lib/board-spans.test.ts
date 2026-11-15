import { describe, expect, it } from "vitest";
import { boardSpans } from "./board-spans";

const g = (id: string, cards: number, chips = 0) => ({ id, cards, chips });

describe("boardSpans", () => {
  it("lets small groups share a row instead of leaving columns empty", () => {
    // Three columns: two 2-card groups would leave a column empty each if stacked.
    expect(boardSpans([g("downloads", 2), g("home", 2), g("network", 2)], 3)).toEqual({
      downloads: 2,
      home: 1,
      network: 2,
    });
  });

  it("starts a new row when a group would be squeezed below half its width", () => {
    expect(boardSpans([g("a", 3), g("b", 4)], 4)).toEqual({ a: 3, b: 4 });
  });

  it("squeezes a group into the rest of a row when it keeps at least half its width", () => {
    expect(boardSpans([g("big", 5), g("small", 2)], 6)).toEqual({ big: 5, small: 1 });
    expect(boardSpans([g("a", 2), g("b", 6)], 6)).toEqual({ a: 2, b: 4 });
  });

  it("widens only as far as a group's cards and chips can fill", () => {
    expect(boardSpans([g("one", 1)], 4)).toEqual({ one: 1 });
    expect(boardSpans([g("links", 0, 9), g("next", 4)], 4)).toEqual({ links: 4, next: 4 });
    // Two cards and two chips fill three columns, closing a row that would end short.
    expect(boardSpans([g("media", 4), g("home", 2, 2)], 5)).toEqual({ media: 4, home: 1 });
    expect(boardSpans([g("downloads", 2), g("home", 2, 2), g("big", 5)], 5)).toEqual({
      downloads: 2,
      home: 3,
      big: 5,
    });
  });

  it("uses one column per group on a single-column board", () => {
    expect(boardSpans([g("a", 3), g("b", 0, 2)], 1)).toEqual({ a: 1, b: 1 });
  });
});

it("leaves the final row short instead of stretching its last group", () => {
  expect(boardSpans([g("media", 4, 2), g("network", 2, 4)], 6)).toEqual({ media: 4, network: 2 });
});
