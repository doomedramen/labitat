import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { TestDb } from "../../tests/helpers/test-database";
const state = vi.hoisted(() => ({ db: null as TestDb | null }));
vi.mock("./db", () => ({ db: new Proxy({}, { get: (_, key) => Reflect.get(state.db!, key) }) }));
import { testDatabase } from "../../tests/helpers/test-database";
import { getLayoutRevision, commitLayout } from "./dashboard-layout";
let sqlite: ReturnType<typeof testDatabase>["sqlite"];
beforeEach(() => {
  ({ db: state.db, sqlite } = testDatabase());
  getLayoutRevision();
  sqlite.exec(
    "INSERT INTO groups(id,name,\"order\") VALUES ('g1','One',0),('g2','Two',1); INSERT INTO items(id,group_id,label,\"order\") VALUES ('a','g1','A',0),('b','g1','B',1)",
  );
});
afterEach(() => sqlite.close());
it("atomically moves services and groups and rejects stale saves", () => {
  const baseRevision = getLayoutRevision();
  const proposal = {
    baseRevision,
    groups: [
      { id: "g2", itemIds: ["a"] },
      { id: "g1", itemIds: ["b"] },
    ],
  };
  expect(commitLayout(proposal).status).toBe("saved");
  expect(sqlite.prepare("SELECT group_id FROM items WHERE id = ?").get("a")).toEqual({
    group_id: "g2",
  });
  expect(commitLayout(proposal).status).toBe("conflict");
});
it("rejects omitted or duplicate IDs without writing anything", () => {
  const revision = getLayoutRevision();
  expect(() =>
    commitLayout({
      baseRevision: revision,
      groups: [
        { id: "g1", itemIds: ["a", "a"] },
        { id: "g2", itemIds: [] },
      ],
    }),
  ).toThrow("exactly once");
  expect(getLayoutRevision()).toBe(revision);
});
it("detects structural edits performed by existing actions", () => {
  const revision = getLayoutRevision();
  sqlite.exec("DELETE FROM items WHERE id = 'b'");
  expect(getLayoutRevision()).toBeGreaterThan(revision);
});
