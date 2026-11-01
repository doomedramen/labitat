import { ArrowUpRight } from "lucide-react";
import { getService } from "@/lib/adapters";
import type { ItemRow } from "@/lib/types";
import { ItemIcon } from "./item-icon";
import { ItemLiveView } from "./item-live-view";
import styles from "./service-card.module.css";

export function ItemCard({ item }: { item: ItemRow }) {
  const service = item.serviceType ? getService(item.serviceType) : null;
  const label = item.label || service?.name || item.href || "Service";
  const identity = (
    <>
      <span className={styles.icon} aria-hidden="true">
        <ItemIcon iconUrl={item.iconUrl} label={label} serviceIcon={service?.icon ?? null} />
      </span>
      <span className={styles.identity}>
        <h3 className={styles.name}>{label}</h3>
      </span>
      {item.href && (
        <span className={styles.launch} aria-hidden="true">
          <ArrowUpRight size={17} />
        </span>
      )}
    </>
  );
  return (
    <article
      className={styles.card}
      data-category={service?.category}
      data-testid="item-card"
      data-item-id={item.id}
    >
      {item.href ? (
        <a
          className={styles.header}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (opens in a new tab)`}
        >
          {identity}
        </a>
      ) : (
        <div className={styles.header}>{identity}</div>
      )}
      <ItemLiveView item={item} />
    </article>
  );
}
