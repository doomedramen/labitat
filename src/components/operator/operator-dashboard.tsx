"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Settings,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
} from "lucide-react";
import type { GroupWithItems, GroupWithCache, ItemRow, ItemWithCache } from "@/lib/types";
import type { ItemLive } from "@/lib/live-types";
import { getService } from "@/lib/adapters";
import { serviceHealth } from "@/lib/service-health";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ThemePicker } from "./theme-picker";
import { LoginForm } from "@/components/auth/login-form";
import { GroupDialog } from "@/components/editor/group-dialog";
import { ItemDialog } from "@/components/editor/item-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SseBanner } from "@/components/dashboard/sse-banner";
import { saveDashboardLayout } from "@/actions/layout";
import { deleteItem } from "@/actions/items";
import { deleteGroup } from "@/actions/groups";
import { updateDashboardTitle } from "@/actions/settings";
import { logout } from "@/actions/auth";
import { ServiceTile, type HealthSummary } from "./service-tile";
import { ServiceDetails } from "./service-details";
import styles from "./operator.module.css";

type Filter = "all" | "attention" | "stale";
const withCache = (item: ItemRow): ItemWithCache => ({
  ...item,
  cachedWidgetData: null,
  cachedPingStatus: null,
  cachedDataAge: null,
});
const clone = (groups: GroupWithItems[]) =>
  groups.map((group) => ({ ...group, items: [...group.items] }));

const HealthObserver = memo(function HealthObserver({
  item,
  report,
  initialNow,
}: {
  initialNow: number;
  item: ItemRow;
  report: (id: string, health: HealthSummary) => void;
}) {
  const live = useItemLive(item.id);
  const now = useVisibleClock();
  const health = serviceHealth(
    item,
    live,
    now ?? initialNow,
    item.serviceType ? getService(item.serviceType)?.clientSide : false,
  );
  useEffect(
    () => report(item.id, { attention: health.attention, stale: health.stale }),
    [report, item.id, health.attention, health.stale],
  );
  return null;
});

export function OperatorDashboard({
  groups,
  revision,
  title,
  canEdit,
  initialSnapshotById,
  serverNow,
}: {
  groups: GroupWithItems[];
  revision: number;
  title: string;
  canEdit: boolean;
  initialSnapshotById: Record<string, ItemLive>;
  serverNow: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [canonical, setCanonical] = useState(groups);
  const [canonicalRevision, setCanonicalRevision] = useState(revision);
  const [draft, setDraft] = useState<GroupWithItems[] | null>(() =>
    canEdit && params.has("arrange") ? clone(groups) : null,
  );
  const baseRevision = useRef(revision);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ groups: GroupWithItems[]; revision: number } | null>(
    null,
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState<Record<string, HealthSummary>>(() =>
    Object.fromEntries(
      groups.flatMap((group) =>
        group.items.map((item) => [
          item.id,
          serviceHealth(
            item,
            initialSnapshotById[item.id] ?? null,
            serverNow,
            getService(item.serviceType ?? "")?.clientSide,
          ),
        ]),
      ),
    ),
  );
  const reportHealth = useCallback(
    (id: string, next: HealthSummary) =>
      setHealth((previous) =>
        previous[id]?.attention === next.attention && previous[id]?.stale === next.stale
          ? previous
          : { ...previous, [id]: next },
      ),
    [],
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [itemEditor, setItemEditor] = useState<{
    item: ItemWithCache | null;
    groupId: string;
  } | null>(null);
  const [groupEditor, setGroupEditor] = useState<{ group: GroupWithCache | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
    kind: "item" | "group";
  } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const arranging = draft !== null;
  useEffect(() => {
    setCanonical(groups);
    setCanonicalRevision(revision);
  }, [groups, revision]);
  useEffect(() => {
    if (params.has("arrange") && canEdit) setDraft((previous) => previous ?? clone(groups));
    else if (!savingRef.current) setDraft(null);
  }, [params, canEdit, groups]);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));
      if (
        (event.key === "k" && (event.ctrlKey || event.metaKey)) ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && event.target === searchRef.current) setQuery("");
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!arranging) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [arranging]);
  function updateUrl(key: string, value: string | null, push = false) {
    const url = new URL(window.location.href);
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    if (push) window.history.pushState({ operatorService: true }, "", url);
    else
      window.history.replaceState(
        {
          operatorService:
            !!url.searchParams.get("service") && !!window.history.state?.operatorService,
        },
        "",
        url,
      );
  }
  const openDetails = useCallback((id: string) => {
    triggerRef.current = document.activeElement as HTMLElement;
    const url = new URL(window.location.href);
    url.searchParams.set("service", id);
    window.history.pushState({ operatorService: true }, "", url);
  }, []);
  function closeDetails() {
    if (window.history.state?.operatorService) window.history.back();
    else updateUrl("service", null);
  }
  const selectedId = params.get("service");
  const lastSelectedId = useRef(selectedId);
  useEffect(() => {
    if (selectedId) lastSelectedId.current = selectedId;
  }, [selectedId]);
  const selected =
    canonical.flatMap((group) => group.items).find((item) => item.id === selectedId) ?? null;
  function configure(item: ItemRow) {
    updateUrl("service", null);
    setItemEditor({ item: withCache(item), groupId: item.groupId });
  }
  function refreshGroups(next: GroupWithItems[]) {
    setCanonical(next);
    router.refresh();
  }
  function startArranging() {
    baseRevision.current = canonicalRevision;
    setDraft(clone(canonical));
    setQuery("");
    setFilter("all");
    setLayoutError(null);
    setConflict(null);
    updateUrl("arrange", "1");
  }
  function cancelArrangement() {
    if (savingRef.current) return;
    if (conflict) {
      setCanonical(conflict.groups);
      setCanonicalRevision(conflict.revision);
    }
    setDraft(null);
    setLayoutError(null);
    setConflict(null);
    updateUrl("arrange", null);
  }
  async function saveArrangement() {
    if (!draft || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setLayoutError(null);
    try {
      const result = await saveDashboardLayout({
        baseRevision: baseRevision.current,
        groups: draft.map((group) => ({
          id: group.id,
          itemIds: group.items.map((item) => item.id),
        })),
      });
      if (result.status === "conflict") {
        setConflict(result);
        setLayoutError(
          "The dashboard changed elsewhere. Your arrangement is still here; reload the latest layout to continue.",
        );
        return;
      }
      setCanonical(result.groups);
      setCanonicalRevision(result.revision);
      setDraft(null);
      updateUrl("arrange", null);
      router.refresh();
    } catch {
      setLayoutError("Could not save the arrangement. Your changes are still here; try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const visible = draft ?? canonical;
  const items = useMemo(() => canonical.flatMap((group) => group.items), [canonical]);
  const queryText = query.trim().toLowerCase();
  const matches = (item: ItemRow, group: GroupWithItems) =>
    (arranging ||
      !queryText ||
      [item.label, item.serviceType, getService(item.serviceType ?? "")?.name, group.name].some(
        (text) => text?.toLowerCase().includes(queryText),
      )) &&
    (arranging ||
      filter === "all" ||
      (filter === "attention" ? health[item.id]?.attention : health[item.id]?.stale));
  const filtered = visible
    .map((group) => ({ ...group, items: group.items.filter((item) => matches(item, group)) }))
    .filter(
      (group) =>
        arranging ||
        group.items.length ||
        (!queryText &&
          filter === "all" &&
          !visible.find((original) => original.id === group.id)?.items.length),
    );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function moveItem(id: string, destination: string, target?: string, direction?: number) {
    if (savingRef.current) return;
    setDraft((previous) => {
      if (!previous) return previous;
      const next = clone(previous);
      const source = next.find((group) => group.items.some((item) => item.id === id));
      const dest = next.find((group) => group.id === destination);
      if (!source || !dest) return previous;
      const index = source.items.findIndex((item) => item.id === id);
      if (direction !== undefined) {
        const to = index + direction;
        if (source !== dest || to < 0 || to >= source.items.length) return previous;
        source.items = arrayMove(source.items, index, to);
      } else {
        const targetIndex = target
          ? dest.items.findIndex((item) => item.id === target)
          : dest.items.length;
        const [item] = source.items.splice(index, 1);
        dest.items.splice(Math.max(0, Math.min(targetIndex, dest.items.length)), 0, {
          ...item,
          groupId: destination,
        });
      }
      return next;
    });
  }
  function drop(event: DragEndEvent) {
    setDragLabel(null);
    if (!event.over || savingRef.current) return;
    const active = event.active.data.current;
    const over = event.over.data.current;
    if (active?.kind === "group" && over?.groupId)
      setDraft((previous) =>
        previous
          ? arrayMove(
              previous,
              previous.findIndex((group) => group.id === active.groupId),
              previous.findIndex((group) => group.id === over.groupId),
            )
          : previous,
      );
    if (active?.kind === "item" && over?.groupId)
      moveItem(active.itemId, over.groupId, over.itemId);
  }
  return (
    <main className={styles.dashboard}>
      <SseBanner />
      {items.map((item) => (
        <HealthObserver key={item.id} item={item} report={reportHealth} initialNow={serverNow} />
      ))}
      <header className={styles.header}>
        <h1 className={styles.heading}>{title}</h1>
        <div className={styles.search}>
          <Search size={16} />
          <Input
            ref={searchRef}
            aria-label="Find a service"
            placeholder="Find a service…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={arranging}
          />
        </div>
        <ThemePicker />
        {canEdit ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label="Manage dashboard" disabled={arranging}>
                <Settings size={16} />
                <span className="hidden sm:inline">Manage</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={startArranging}>Arrange dashboard</DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canonical.length}
                onSelect={() => setItemEditor({ item: null, groupId: canonical[0]?.id ?? "" })}
              >
                Add service
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setGroupEditor({ group: null })}>
                Add group
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setTitleDraft(title);
                  setRenameOpen(true);
                }}
              >
                Rename dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void logout()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" onClick={() => setLoginOpen(true)}>
            Sign in
          </Button>
        )}
      </header>
      {!arranging && (
        <div className={styles.toolbar} aria-label="Service filters">
          {(
            [
              ["all", "All"],
              ["attention", "Needs attention"],
              ["stale", "Stale"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={styles.filter}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}{" "}
              <span className="tabular-nums">
                {value === "all"
                  ? items.length
                  : items.filter((item) =>
                      value === "attention" ? health[item.id]?.attention : health[item.id]?.stale,
                    ).length}
              </span>
            </button>
          ))}
        </div>
      )}
      {arranging && (
        <div className={styles.arrangeBar}>
          <p>Arrange groups and services. Changes apply when you save.</p>
          <Button variant="outline" disabled={saving} onClick={cancelArrangement}>
            {conflict ? "Reload latest (discard arrangement)" : "Cancel"}
          </Button>
          <Button disabled={saving || !!conflict} onClick={() => void saveArrangement()}>
            {saving ? "Saving…" : "Save arrangement"}
          </Button>
        </div>
      )}
      {layoutError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {layoutError}
        </p>
      )}
      <DndContext
        id="operator-arrangement"
        sensors={sensors}
        collisionDetection={(args) => {
          const collisions = args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
          const allowed = collisions.filter((collision) =>
            args.active.data.current?.kind === "group"
              ? String(collision.id).startsWith("group:")
              : !String(collision.id).startsWith("group:"),
          );
          const tile = allowed.filter((collision) => String(collision.id).startsWith("item:"));
          return tile.length ? tile : allowed;
        }}
        onDragStart={(event) => setDragLabel(event.active.data.current?.label ?? "Moving")}
        onDragEnd={drop}
        onDragCancel={() => setDragLabel(null)}
      >
        <SortableContext
          items={visible.map((group) => `group:${group.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {filtered.map((group) => (
            <OperatorGroup
              initialNow={serverNow}
              key={group.id}
              group={group}
              arranging={arranging}
              disabled={saving}
              allGroups={visible}
              onDetails={openDetails}
              onMoveItem={moveItem}
              onGroupMove={(direction) =>
                setDraft((previous) => {
                  if (!previous) return previous;
                  const index = previous.findIndex((g) => g.id === group.id);
                  const to = index + direction;
                  return to < 0 || to >= previous.length
                    ? previous
                    : arrayMove(previous, index, to);
                })
              }
              onAdd={() => setItemEditor({ item: null, groupId: group.id })}
              onEdit={() =>
                setGroupEditor({ group: { ...group, items: group.items.map(withCache) } })
              }
              onDelete={() => setDeleteTarget({ kind: "group", id: group.id, label: group.name })}
              canEdit={canEdit}
            />
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {dragLabel && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-lg">
              {dragLabel}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {!filtered.length && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {canonical.length
            ? "No services match this view."
            : "Add a group to start your dashboard."}
          {!canonical.length && canEdit && (
            <Button
              className="ml-3"
              variant="outline"
              onClick={() => setGroupEditor({ group: null })}
            >
              Add group
            </Button>
          )}
        </div>
      )}
      <ServiceDetails
        item={selected}
        onClose={closeDetails}
        canConfigure={canEdit && !arranging}
        onConfigure={configure}
        onDelete={(item) => {
          updateUrl("service", null);
          setDeleteTarget({ kind: "item", id: item.id, label: item.label });
        }}
        onRestoreFocus={() => {
          if (document.querySelector('[role="dialog"][data-state="open"]')) return;
          const target = triggerRef.current?.isConnected
            ? triggerRef.current
            : document.querySelector<HTMLElement>(
                `[data-details-for="${window.CSS.escape(lastSelectedId.current ?? "")}"]`,
              );
          (target ?? searchRef.current)?.focus();
        }}
      />

      {itemEditor && (
        <ItemDialog
          open
          onOpenChange={(open) => {
            if (!open) setItemEditor(null);
          }}
          item={itemEditor.item}
          groupId={itemEditor.groupId}
          onGroupsChanged={refreshGroups}
        />
      )}
      {groupEditor && (
        <GroupDialog
          open
          onOpenChange={(open) => {
            if (!open) setGroupEditor(null);
          }}
          group={groupEditor.group}
          onGroupsChanged={refreshGroups}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget?.kind === "group" ? "Delete group" : "Delete service"}
        description={`Delete ${deleteTarget?.label ?? "this service"}${deleteTarget?.kind === "group" ? " and every service in it" : ""}? This cannot be undone.`}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const next =
            deleteTarget.kind === "group"
              ? await deleteGroup(deleteTarget.id)
              : await deleteItem(deleteTarget.id);
          updateUrl("service", null);
          refreshGroups(next);
        }}
      />
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>Sign in to manage the dashboard.</DialogDescription>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>
      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!titleSaving) setRenameOpen(open);
        }}
      >
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (titleSaving) return;
              setTitleSaving(true);
              setTitleError(null);
              try {
                await updateDashboardTitle(titleDraft);
                setRenameOpen(false);
                router.refresh();
              } catch {
                setTitleError("Could not save the title. Try again.");
              } finally {
                setTitleSaving(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename dashboard</DialogTitle>
              <DialogDescription>Choose a short dashboard title.</DialogDescription>
            </DialogHeader>
            <label className="my-4 block text-sm">
              Dashboard title
              <Input
                aria-label="Dashboard title"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                required
                maxLength={100}
              />
            </label>
            {titleError && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {titleError}
              </p>
            )}
            <Button type="submit" disabled={titleSaving}>
              {titleSaving ? "Saving…" : "Save title"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function OperatorGroup({
  initialNow,
  group,
  arranging,
  disabled,
  allGroups,
  onDetails,
  onMoveItem,
  onGroupMove,
  onAdd,
  onEdit,
  onDelete,
  canEdit,
}: {
  initialNow: number;
  group: GroupWithItems;
  arranging: boolean;
  disabled: boolean;
  allGroups: GroupWithItems[];
  onDetails: (id: string) => void;
  onMoveItem: (id: string, group: string, target?: string, direction?: number) => void;
  onGroupMove: (direction: number) => void;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const sortable = useSortable({
    id: `group:${group.id}`,
    disabled: !arranging || disabled,
    data: { kind: "group", groupId: group.id, label: group.name },
  });
  const drop = useDroppable({
    id: `drop:${group.id}`,
    disabled: !arranging || disabled,
    data: { kind: "drop", groupId: group.id },
  });
  return (
    <section
      ref={sortable.setNodeRef}
      className={styles.group}
      data-group-id={group.id}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }}
    >
      <header className={styles.groupHeader}>
        {arranging && (
          <button
            type="button"
            {...sortable.attributes}
            {...sortable.listeners}
            className="touch-none"
            aria-label={`Move group ${group.name}`}
          >
            <GripVertical size={16} />
          </button>
        )}
        <h2>{group.name}</h2>
        {arranging ? (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Move group ${group.name} earlier`}
              disabled={disabled || allGroups[0]?.id === group.id}
              onClick={() => onGroupMove(-1)}
            >
              <ArrowLeft size={14} />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Move group ${group.name} later`}
              disabled={disabled || allGroups.at(-1)?.id === group.id}
              onClick={() => onGroupMove(1)}
            >
              <ArrowRight size={14} />
            </Button>
          </>
        ) : (
          canEdit && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={`Manage group ${group.name}`}>
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onAdd}>Add service</DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit}>Edit group</DropdownMenuItem>
                <DropdownMenuItem onSelect={onDelete}>Delete group</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </header>
      <div
        ref={drop.setNodeRef}
        className={styles.grid}
        style={drop.isOver ? { outline: "1px dashed var(--primary)", outlineOffset: 3 } : undefined}
      >
        <SortableContext
          items={group.items.map((item) => `item:${item.id}`)}
          strategy={rectSortingStrategy}
        >
          {group.items.map((item, index) =>
            arranging ? (
              <ArrangingTile
                initialNow={initialNow}
                key={item.id}
                item={item}
                disabled={disabled}
                onDetails={onDetails}
                allGroups={allGroups}
                first={index === 0}
                last={index === group.items.length - 1}
                onMove={(direction) => onMoveItem(item.id, group.id, undefined, direction)}
                onGroup={(id) => onMoveItem(item.id, id)}
              />
            ) : (
              <ServiceTile
                key={item.id}
                item={item}
                onDetails={onDetails}
                initialNow={initialNow}
              />
            ),
          )}
        </SortableContext>
        {!group.items.length && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            {arranging ? (
              "Drop services here"
            ) : canEdit ? (
              <button type="button" onClick={onAdd}>
                Add service
              </button>
            ) : (
              "No services"
            )}
          </div>
        )}
      </div>
    </section>
  );
}
function ArrangingTile({
  initialNow,
  item,
  disabled,
  onDetails,
  allGroups,
  first,
  last,
  onMove,
  onGroup,
}: {
  initialNow: number;
  item: ItemRow;
  disabled: boolean;
  onDetails: (id: string) => void;
  allGroups: GroupWithItems[];
  first: boolean;
  last: boolean;
  onMove: (direction: number) => void;
  onGroup: (id: string) => void;
}) {
  const sortable = useSortable({
    id: `item:${item.id}`,
    disabled,
    data: { kind: "item", itemId: item.id, groupId: item.groupId, label: item.label },
  });
  return (
    <div
      ref={sortable.setNodeRef}
      className={styles.arrangeTile}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }}
    >
      <button
        ref={sortable.setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        disabled={disabled}
        {...sortable.attributes}
        {...sortable.listeners}
        aria-label={`Move service ${item.label}`}
      >
        <GripVertical size={14} />
      </button>
      <ServiceTile item={item} onDetails={onDetails} arranging initialNow={initialNow} />
      <div className={styles.moveActions}>
        <button
          type="button"
          disabled={disabled || first}
          onClick={() => onMove(-1)}
          aria-label={`Move ${item.label} earlier`}
        >
          <ArrowLeft size={12} />
        </button>
        <button
          type="button"
          disabled={disabled || last}
          onClick={() => onMove(1)}
          aria-label={`Move ${item.label} later`}
        >
          <ArrowRight size={12} />
        </button>
        <select
          className="max-w-24 bg-card text-xs"
          aria-label={`Move ${item.label} to group`}
          value={item.groupId}
          disabled={disabled}
          onChange={(event) => onGroup(event.target.value)}
        >
          {allGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
