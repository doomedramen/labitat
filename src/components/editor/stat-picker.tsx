"use client";

import { useId, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { resolveStatCardLayout, SECONDARY_STATS, type StatCardOrder } from "@/lib/stat-card-layout";
import type { StatItem } from "@/components/widgets";
import styles from "./stat-picker.module.css";

const NONE = "";

/**
 * Chooses what a service card shows: one main stat, then an ordered list of extra stats.
 * Extras past SECONDARY_STATS stay in the details panel only. With no main stat the
 * service is shown as a link chip instead of a card.
 *
 * Storage is unchanged: `active[0]` is the main stat, the rest of `active` are extras.
 */
export function StatPicker({
  label,
  items,
  order,
  onOrderChange,
  defaultActiveIds,
}: {
  label: string;
  items: StatItem[];
  order: StatCardOrder | null;
  onOrderChange: (order: StatCardOrder | null) => void;
  defaultActiveIds?: string[];
}) {
  const mainId = useId();
  const { activeItems, unusedItems } = useMemo(
    () => resolveStatCardLayout(items, order, defaultActiveIds),
    [items, order, defaultActiveIds],
  );
  const [lead, ...extras] = activeItems;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [announcement, setAnnouncement] = useState("");

  function save(active: StatItem[]) {
    const ids = new Set(active.map((item) => item.id));
    onOrderChange({
      active: active.map((item) => item.id),
      unused: items.filter((item) => !ids.has(item.id)).map((item) => item.id),
    });
  }
  function setMain(id: string) {
    if (id === NONE) {
      save([]);
      setAnnouncement(`${label} will show as a link without stats.`);
      return;
    }
    const chosen = items.find((item) => item.id === id)!;
    // The previous main stat becomes the first extra rather than disappearing.
    save([chosen, ...activeItems.filter((item) => item.id !== id)]);
    setAnnouncement(`${chosen.label} is now the main stat.`);
  }
  function moveExtra(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= extras.length) return;
    save([lead, ...arrayMove(extras, index, target)]);
    setAnnouncement(`${extras[index].label} moved to position ${target + 1}.`);
  }
  function removeExtra(id: string) {
    const removed = extras.find((item) => item.id === id);
    save([lead, ...extras.filter((item) => item.id !== id)]);
    if (removed) setAnnouncement(`${removed.label} removed.`);
  }
  function addExtra(item: StatItem) {
    save([lead, ...extras, item]);
    setAnnouncement(
      extras.length < SECONDARY_STATS
        ? `${item.label} added to the card.`
        : `${item.label} added to the details panel.`,
    );
  }
  function drop({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = extras.findIndex((item) => item.id === active.id);
    const to = extras.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    save([lead, ...arrayMove(extras, from, to)]);
  }

  return (
    <div className={styles.picker}>
      <CardPreview label={label} lead={lead} extras={extras.slice(0, SECONDARY_STATS)} />

      <div className={styles.field}>
        <label htmlFor={mainId}>Main stat</label>
        <select
          id={mainId}
          className={styles.select}
          value={lead?.id ?? NONE}
          onChange={(event) => setMain(event.target.value)}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          <option value={NONE}>None, show as a link</option>
        </select>
      </div>

      {lead && (
        <section className={styles.field} aria-labelledby={`${mainId}-extras`}>
          <h4 id={`${mainId}-extras`}>
            Also show <span>Up to {SECONDARY_STATS} on the card</span>
          </h4>
          {extras.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drop}>
              <SortableContext
                items={extras.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className={styles.list} aria-label="Extra stats, in order">
                  {extras.map((item, index) => (
                    <Extra
                      key={item.id}
                      item={item}
                      index={index}
                      count={extras.length}
                      onMove={(direction) => moveExtra(index, direction)}
                      onRemove={() => removeExtra(item.id)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          ) : (
            <p className={styles.hint}>Only the main stat is shown.</p>
          )}
          {unusedItems.length > 0 && (
            <div className={styles.add} role="group" aria-label="Add a stat">
              {unusedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid="unused-stat-card"
                  onClick={() => addExtra(item)}
                  aria-label={`Add ${item.label}`}
                >
                  <Plus size={13} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <button type="button" className={styles.reset} onClick={() => onOrderChange(null)}>
        Reset to defaults
      </button>
      <p className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function Extra({
  item,
  index,
  count,
  onMove,
  onRemove,
}: {
  item: StatItem;
  index: number;
  count: number;
  onMove: (direction: number) => void;
  onRemove: () => void;
}) {
  const sortable = useSortable({ id: item.id });
  const detailsOnly = index >= SECONDARY_STATS;
  return (
    <>
      {index === SECONDARY_STATS && (
        <li className={styles.divider} aria-hidden="true">
          Details panel only
        </li>
      )}
      <li
        ref={sortable.setNodeRef}
        className={styles.extra}
        data-testid="stat-card"
        data-details-only={detailsOnly || undefined}
        style={{
          transform: CSS.Translate.toString(sortable.transform),
          transition: sortable.transition,
          opacity: sortable.isDragging ? 0.5 : 1,
        }}
      >
        <button
          ref={sortable.setActivatorNodeRef}
          type="button"
          className={styles.handle}
          aria-label={`Drag ${item.label}`}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical size={14} />
        </button>
        <span className={styles.extraLabel}>
          {item.label}
          {detailsOnly && <span className={styles.srOnly}> (details panel only)</span>}
        </span>
        <span className={styles.extraValue}>{String(item.value)}</span>
        <button
          type="button"
          className={styles.action}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label={`Move ${item.label} up`}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          className={styles.action}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          aria-label={`Move ${item.label} down`}
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={onRemove}
          aria-label={`Remove ${item.label}`}
        >
          <X size={14} />
        </button>
      </li>
    </>
  );
}

/** A small, static rendering of the overview card, so choices are judged as they will look. */
function CardPreview({
  label,
  lead,
  extras,
}: {
  label: string;
  lead: StatItem | undefined;
  extras: StatItem[];
}) {
  return (
    <figure className={styles.preview} aria-label="Card preview">
      {lead ? (
        <div className={styles.card}>
          <span className={styles.cardName}>{label}</span>
          <span className={styles.cardValue}>
            {String(lead.value)}
            <small>{lead.label}</small>
          </span>
          {extras.length > 0 && (
            <span className={styles.cardRest}>
              {extras.map((item) => (
                <span key={item.id}>
                  <b>{String(item.value)}</b> {item.label}
                </span>
              ))}
            </span>
          )}
        </div>
      ) : (
        <div className={styles.chip}>{label}</div>
      )}
      <figcaption>{lead ? "On the dashboard" : "Shown as a link"}</figcaption>
    </figure>
  );
}
