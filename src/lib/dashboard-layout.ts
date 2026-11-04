import { asc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { dashboardState, groups, items } from "./db/schema";
export type DashboardLayout = { baseRevision: number; groups: { id: string; itemIds: string[] }[] };
export const layoutTriggers = [
  ...["INSERT", "DELETE"].flatMap((operation) =>
    ["items", "groups"].map(
      (table) =>
        `CREATE TRIGGER IF NOT EXISTS layout_${table}_${operation.toLowerCase()} AFTER ${operation} ON ${table} BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END`,
    ),
  ),
  'CREATE TRIGGER IF NOT EXISTS layout_items_update AFTER UPDATE OF group_id, "order" ON items WHEN OLD.group_id != NEW.group_id OR OLD."order" != NEW."order" BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END',
  'CREATE TRIGGER IF NOT EXISTS layout_groups_update AFTER UPDATE OF "order" ON groups WHEN OLD."order" != NEW."order" BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END',
];
export function initializeLayoutState() {
  db.insert(dashboardState).values({ id: 1, revision: 0 }).onConflictDoNothing().run();
  for (const trigger of layoutTriggers) db.run(sql.raw(trigger));
}
export function getLayoutRevision(): number {
  initializeLayoutState();
  return db.select().from(dashboardState).where(eq(dashboardState.id, 1)).get()!.revision;
}
/** Read ordering and its revision in one SQLite snapshot. */
export function readDashboardLayout() {
  initializeLayoutState();
  return db.transaction((tx) => {
    const revision = tx
      .select()
      .from(dashboardState)
      .where(eq(dashboardState.id, 1))
      .get()!.revision;
    const orderedGroups = tx.select().from(groups).orderBy(asc(groups.order)).all();
    const orderedItems = tx.select().from(items).orderBy(asc(items.order)).all();
    return {
      revision,
      groups: orderedGroups.map((group) => ({
        ...group,
        items: orderedItems.filter((item) => item.groupId === group.id),
      })),
    };
  });
}
export function commitLayout(layout: DashboardLayout): {
  status: "saved" | "conflict";
  revision: number;
} {
  initializeLayoutState();
  return db.transaction(
    (tx) => {
      const current = tx
        .select()
        .from(dashboardState)
        .where(eq(dashboardState.id, 1))
        .get()!.revision;
      if (layout.baseRevision !== current) return { status: "conflict", revision: current };
      const groupIds = tx
        .select({ id: groups.id })
        .from(groups)
        .all()
        .map((row) => row.id);
      const itemIds = tx
        .select({ id: items.id })
        .from(items)
        .all()
        .map((row) => row.id);
      const proposedGroups = layout.groups.map((group) => group.id);
      const proposedItems = layout.groups.flatMap((group) => group.itemIds);
      function exact(actual: string[], proposed: string[]) {
        return (
          actual.length === proposed.length &&
          new Set(proposed).size === proposed.length &&
          actual.every((id) => proposed.includes(id))
        );
      }
      if (!exact(groupIds, proposedGroups) || !exact(itemIds, proposedItems))
        throw new Error("Layout must include every group and service exactly once");
      layout.groups.forEach((group, order) => {
        tx.update(groups).set({ order }).where(eq(groups.id, group.id)).run();
        group.itemIds.forEach((id, itemOrder) =>
          tx
            .update(items)
            .set({ order: itemOrder, groupId: group.id })
            .where(eq(items.id, id))
            .run(),
        );
      });
      return {
        status: "saved",
        revision: tx.select().from(dashboardState).where(eq(dashboardState.id, 1)).get()!.revision,
      };
    },
    { behavior: "immediate" },
  );
}
