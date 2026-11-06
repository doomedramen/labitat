import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Search,
  Sun,
  Moon,
  SlidersHorizontal,
  X,
  ChevronRight,
  Download,
  Radio,
  Pause,
  Play,
  GripVertical,
  Check,
  AlertCircle,
  Layers,
  Server,
  Clapperboard,
  House,
  Network,
  RotateCcw,
} from "lucide-react";
import { services, groupNames, activity, type Service } from "./fixture";
import "./style.css";

type Direction = "precision" | "slate";
type Scenario = "busy" | "idle" | "disconnected" | "stress" | "hidden";
const initialParams = new URLSearchParams(location.search);
const icons = [Clapperboard, Layers, Download, House, Server, Network];
function Icon({ service }: { service: Service }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="app-icon" aria-hidden="true">
      {service.icon && !failed ? (
        <img
          src={`https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${service.icon}.png`}
          onError={() => setFailed(true)}
          alt=""
        />
      ) : (
        <Server size={20} />
      )}
    </span>
  );
}
function MetricValue({ value }: { value: string }) {
  const split = value.match(/^(.+?) (MB\/s|KB\/s|Mb\/s|ms)$/);
  return split ? (
    <>
      {split[1]}
      <span className="metric-unit">{split[2]}</span>
    </>
  ) : (
    <>{value}</>
  );
}
function App() {
  const [direction, setDirection] = useState<Direction>(
    initialParams.get("direction") === "slate" ? "slate" : "precision",
  );
  const [theme, setTheme] = useState(initialParams.get("theme") === "light" ? "light" : "dark");
  const [scenario, setScenario] = useState<Scenario>("busy");
  const [items, setItems] = useState(services);
  const [unused, setUnused] = useState<Record<string, Service["metrics"]>>({});
  const [groups, setGroups] = useState(groupNames);
  const [draft, setDraft] = useState<Service[] | null>(null);
  const [draftGroups, setDraftGroups] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState(initialParams.get("service"));
  const [tab, setTab] = useState("Overview");
  const [outcome, setOutcome] = useState("success");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [references, setReferences] = useState(false);
  const [range, setRange] = useState("1h");
  const [dragged, setDragged] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!statusOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".status-control")) {
        if (
          document.activeElement instanceof HTMLElement &&
          document.activeElement.closest(".status-control")
        ) {
          document.activeElement.blur();
        }
        setStatusOpen(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [statusOpen]);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      if (dialog.current?.open) return;
      root.style.setProperty(
        "--preview-scrollbar-gutter",
        `${Math.max(0, window.innerWidth - root.getBoundingClientRect().width)}px`,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--preview-scrollbar-gutter");
    };
  }, []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = draft ?? items;
  const activeGroups = draftGroups ?? groups;
  const service = active.find((item) => item.id === selected);
  const displayName = (item: Service) =>
    scenario === "stress" && item.id === "catacomb"
      ? "Catacomb — primary virtualisation and storage cluster"
      : item.name;
  const metrics = (item: Service) => (scenario === "hidden" ? [] : item.metrics);
  const isStale = (item: Service) => scenario === "disconnected" || !!item.stale;
  const matches = (item: Service) =>
    (!query ||
      `${item.name} ${item.type} ${item.group}`.toLowerCase().includes(query.toLowerCase())) &&
    (!groupFilter || item.group === groupFilter) &&
    (filter === "all" || (filter === "attention" ? item.health !== "healthy" : isStale(item)));
  const filtered = active.filter(matches);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.direction = direction;
    const url = new URL(location.href);
    url.searchParams.set("direction", direction);
    url.searchParams.set("theme", theme);
    history.replaceState(history.state, "", url);
  }, [direction, theme]);
  useEffect(() => {
    const pop = () => {
      setSelected(new URLSearchParams(location.search).get("service"));
    };
    const keys = (event: KeyboardEvent) => {
      if (dialog.current?.open) return;
      const input =
        event.target instanceof HTMLElement &&
        (event.target.matches("input,select,textarea") || event.target.isContentEditable);
      if (
        (!input && event.key === "/") ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    addEventListener("popstate", pop);
    addEventListener("keydown", keys);
    return () => {
      removeEventListener("popstate", pop);
      removeEventListener("keydown", keys);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (service) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
      trigger.current?.focus({ preventScroll: true });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [service?.id]);
  function open(id: string, target: HTMLElement) {
    trigger.current = target;
    setTab("Overview");
    setSelected(id);
    const url = new URL(location.href);
    url.searchParams.set("service", id);
    history.pushState({ detail: true }, "", url);
  }
  function close() {
    if (history.state?.detail) history.back();
    else {
      const url = new URL(location.href);
      url.searchParams.delete("service");
      history.replaceState(null, "", url);
      setSelected(null);
    }
  }
  function updateMetrics(id: string, metrics: Service["metrics"]) {
    if (saving) return;
    const update = (list: Service[]) =>
      list.map((item) => (item.id === id ? { ...item, metrics } : item));
    if (draft) setDraft(update(draft));
    else setItems(update(items));
  }
  function arrange() {
    setDraft(structuredClone(items));
    setDraftGroups([...groups]);
    setQuery("");
    setFilter("all");
    setGroupFilter("");
    setNotice("");
    setError("");
  }
  function cancel() {
    if (saving) return;
    setDraft(null);
    setDraftGroups(null);
    setError("");
    setNotice("Arrangement cancelled. Nothing was saved.");
  }
  function save() {
    if (saving || !draft || !draftGroups) return;
    setSaving(true);
    setError("");
    timer.current = setTimeout(() => {
      setSaving(false);
      if (outcome === "failure") {
        setError("Could not save. Your changes are still here. Retry or cancel.");
        return;
      }
      if (outcome === "conflict") {
        setError(
          "The layout changed in another session. Reload the saved layout before trying again.",
        );
        return;
      }
      setItems(draft);
      setGroups(draftGroups);
      setDraft(null);
      setDraftGroups(null);
      setNotice("Arrangement saved in this preview only.");
    }, 700);
  }
  function move(id: string, delta: number) {
    if (!draft || saving) return;
    const item = draft.find((i) => i.id === id)!;
    const peers = draft.filter((i) => i.group === item.group);
    const peer = peers[peers.indexOf(item) + delta];
    if (!peer) return;
    const copy = [...draft];
    const a = copy.indexOf(item),
      b = copy.indexOf(peer);
    [copy[a], copy[b]] = [copy[b], copy[a]];
    setDraft(copy);
  }
  function drop(group: string, before?: string) {
    if (!draft || !dragged || saving || dragged === before) return;
    const item = draft.find((i) => i.id === dragged)!;
    const copy = draft.filter((i) => i.id !== dragged);
    const index = before ? copy.findIndex((i) => i.id === before) : copy.length;
    copy.splice(index, 0, { ...item, group });
    setDraft(copy);
    setDragged(null);
  }
  function moveGroup(name: string, delta: number) {
    if (!draftGroups || saving) return;
    const copy = [...draftGroups];
    const a = copy.indexOf(name),
      b = a + delta;
    if (b < 0 || b >= copy.length) return;
    [copy[a], copy[b]] = [copy[b], copy[a]];
    setDraftGroups(copy);
  }
  return (
    <>
      <aside className="studio" aria-label="Design review controls">
        <a className="studio-title" href="#dashboard">
          LABITAT <span>DESIGN STUDY / 01</span>
        </a>
        <div className="direction-picker" aria-label="Visual direction">
          {(["precision", "slate"] as const).map((d, i) => (
            <button key={d} aria-pressed={direction === d} onClick={() => setDirection(d)}>
              <span>0{i + 1}</span> {d === "precision" ? "Precision instrument" : "Layered slate"}
            </button>
          ))}
        </div>
        <details className="review-controls">
          <summary>Review tools</summary>
          <div>
            <label>
              Scenario
              <select
                aria-label="Scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as Scenario)}
              >
                <option value="busy">Busy lab</option>
                <option value="idle">Idle lab</option>
                <option value="disconnected">Disconnected</option>
                <option value="stress">Long names & large values</option>
                <option value="hidden">All metrics hidden</option>
              </select>
            </label>
            <label>
              Next layout save
              <select
                aria-label="Save outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="success">Success</option>
                <option value="failure">Network failure</option>
                <option value="conflict">Concurrent edit</option>
              </select>
            </label>
            <button onClick={() => setReferences(!references)}>
              {references ? "Back to dashboard" : "Reference board"}
            </button>
            <p>
              Synthetic data. Changes stay in memory. Launch links open reserved .test addresses.
            </p>
          </div>
        </details>
      </aside>
      {references ? (
        <ReferenceBoard />
      ) : (
        <main id="dashboard" className="dashboard">
          <header className="header">
            <a className="wordmark" href="#dashboard">
              <span className="brand-icon">
                <Layers size={20} />
              </span>
              labitat<span className="wordmark-caption"> / home network</span>
            </a>
            <div className="header-actions">
              <span className="connection">
                <i data-state={scenario === "disconnected" ? "stale" : "healthy"} />
                {scenario === "disconnected" ? "Reconnecting" : "Live updates"}
              </span>
              <button
                className="icon-button"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="manage" onClick={arrange} disabled={!!draft}>
                <SlidersHorizontal size={16} />
                <span>Arrange</span>
              </button>
            </div>
          </header>
          <section className="heading-row">
            <div>
              <h1>
                Page Family Homelab<span className="title-dot">.</span>
              </h1>
            </div>
            <div className="search">
              <Search size={18} />
              <input
                ref={search}
                aria-label="Find a service"
                placeholder="Find a service…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={!!draft}
              />
              {query ? (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
          </section>
          <div className="toolbar">
            <div className="filters">
              {[
                ["all", "All", items.length],
                [
                  "attention",
                  "Needs attention",
                  items.filter((i) => i.health !== "healthy").length,
                ],
                ["stale", "Stale", items.filter(isStale).length],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  disabled={!!draft}
                  onClick={() => setFilter(String(value))}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <select
              aria-label="Filter by group"
              value={groupFilter}
              disabled={!!draft}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          {scenario === "disconnected" && (
            <div className="banner" role="status">
              <AlertCircle size={18} />
              Live connection lost. Values are last observed; activity is unavailable.
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={16} />
              {notice}
              <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {draft && (
            <div className="arrange-bar">
              <div>
                <strong>Arrange your space</strong>
                <p>Drag services, or use their move controls.</p>
              </div>
              <button disabled={saving} onClick={cancel}>
                Cancel
              </button>
              <button className="primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save arrangement"}
              </button>
              {error && (
                <div className="save-error" role="alert">
                  {error}
                  {outcome === "conflict" ? (
                    <button
                      onClick={() => {
                        setDraft(structuredClone(items));
                        setDraftGroups([...groups]);
                        setError("");
                        setOutcome("success");
                      }}
                    >
                      Reload saved layout
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setOutcome("success");
                        setError("");
                      }}
                    >
                      Restore connection
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <section className="activity-section" aria-label="Live activity">
            <div className="section-title">
              <h2>Live activity</h2>
              {scenario === "disconnected" && <span>Updates paused</span>}
            </div>
            <div className="activity-grid">
              {(["download", "stream"] as const).map((kind) => {
                const entries =
                  scenario === "idle" || scenario === "disconnected"
                    ? []
                    : activity.filter(
                        (a) => a.kind === kind && filtered.some((i) => i.id === a.source),
                      );
                const more = expanded.includes(kind);
                const KindIcon = kind === "download" ? Download : Radio;
                return (
                  <section className={`activity-panel ${kind}`} key={kind}>
                    <header>
                      <span className="activity-symbol">
                        <KindIcon size={18} />
                      </span>
                      <h3>{kind === "download" ? "Downloads" : "Active streams"}</h3>
                      <span className="count">{entries.length}</span>
                      <span className="panel-meta">
                        {entries.length
                          ? kind === "download"
                            ? `${entries.filter((a) => a.activity === "Downloading").length} transferring`
                            : `${entries.filter((a) => a.activity === "Playing").length} playing · ${entries.filter((a) => a.activity === "Paused").length} paused`
                          : ""}
                      </span>
                    </header>
                    {entries.length ? (
                      <>
                        <div className="activity-list">
                          {entries.slice(0, more ? undefined : 2).map((entry) => (
                            <button
                              key={entry.id}
                              className="activity-row"
                              onClick={(e) => open(entry.source, e.currentTarget)}
                            >
                              <span className="activity-row-icon">
                                {kind === "download" ? (
                                  <Download size={17} />
                                ) : entry.activity === "Paused" ? (
                                  <Pause size={17} />
                                ) : (
                                  <Play size={17} />
                                )}
                              </span>
                              <span className="activity-content">
                                <span className="activity-top">
                                  <strong>{entry.title}</strong>
                                  <span className="activity-rate">
                                    {entry.speed ?? entry.activity}
                                  </span>
                                </span>
                                <span className="activity-sub">
                                  <span>{entry.subtitle}</span>
                                  <span>
                                    {kind === "download"
                                      ? (entry.timeLeft ?? entry.activity)
                                      : entry.viewer}
                                  </span>
                                </span>
                                {entry.progress !== undefined && (
                                  <span
                                    className="progress"
                                    role="progressbar"
                                    aria-label={`${entry.title} progress`}
                                    aria-valuenow={entry.progress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  >
                                    <span
                                      style={{ width: `${entry.progress}%` }}
                                      data-paused={entry.activity === "Paused"}
                                    />
                                  </span>
                                )}
                                <span className="activity-foot">
                                  <span>
                                    {items.find((i) => i.id === entry.source)?.name}
                                    {kind === "download"
                                      ? ` · ${entry.size}`
                                      : ` · ${entry.timeLeft}`}
                                  </span>
                                  <span>
                                    {entry.progress !== undefined
                                      ? `${entry.progress}%`
                                      : "Progress unavailable"}
                                  </span>
                                </span>
                              </span>
                              <ChevronRight size={15} className="row-chevron" />
                            </button>
                          ))}
                        </div>
                        {entries.length > 2 && (
                          <button
                            className="show-more"
                            onClick={() =>
                              setExpanded(
                                more ? expanded.filter((i) => i !== kind) : [...expanded, kind],
                              )
                            }
                          >
                            {more
                              ? "Show less"
                              : `Show ${entries.length - 2} more ${kind === "download" ? "downloads" : "stream"}`}
                            <span>{more ? "−" : "+"}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="empty-activity">
                        {scenario === "disconnected"
                          ? "Waiting for fresh observations"
                          : scenario === "idle"
                            ? kind === "download"
                              ? "No active downloads."
                              : "No active streams."
                            : "No activity matches these filters."}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
          <div className="service-groups">
            {activeGroups
              .filter((g) => !groupFilter || g === groupFilter)
              .map((group, index) => {
                const groupItems = filtered.filter((i) => i.group === group);
                if (!groupItems.length && !draft) return null;
                const GroupIcon = icons[groupNames.indexOf(group)];
                return (
                  <section
                    className="service-group"
                    key={group}
                    onDragOver={(e) => {
                      if (draft) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(group);
                    }}
                  >
                    <header className="group-header">
                      <GroupIcon size={17} />
                      <h2>{group}</h2>
                      <span className="group-rule" />
                      {draft && (
                        <div className="group-moves">
                          <button
                            aria-label={`Move ${group} group up`}
                            disabled={saving || index === 0}
                            onClick={() => moveGroup(group, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            aria-label={`Move ${group} group down`}
                            disabled={saving || index === activeGroups.length - 1}
                            onClick={() => moveGroup(group, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      )}
                    </header>
                    <div className="service-grid">
                      {groupItems.map((item, idx) => (
                        <article
                          className="service"
                          data-health={item.health}
                          data-layout={metrics(item).length ? "metrics" : "launcher"}
                          key={item.id}
                          data-id={item.id}
                          onDragOver={(e) => {
                            if (draft) e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            drop(group, item.id);
                          }}
                        >
                          {!draft && (
                            <a
                              className="service-launch"
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${displayName(item)} (opens in a new tab)`}
                            />
                          )}
                          <div className="service-identity">
                            <Icon service={item} />
                            <span className="service-name">
                              <span>{displayName(item)}</span>
                              <ArrowUpRight size={12} />
                            </span>
                            <div
                              className="status-control"
                              data-open={statusOpen === item.id || undefined}
                            >
                              <button
                                className="status-trigger"
                                aria-label={`Status for ${item.name}: ${item.health === "healthy" ? (isStale(item) ? "Stale" : "Healthy") : "Needs attention"}`}
                                aria-describedby={`status-${item.id}`}
                                onClick={() =>
                                  setStatusOpen(statusOpen === item.id ? null : item.id)
                                }
                                onBlur={(event) => {
                                  if (
                                    !event.currentTarget.parentElement?.contains(
                                      event.relatedTarget,
                                    )
                                  )
                                    setStatusOpen(null);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    setStatusOpen(null);
                                    event.currentTarget.blur();
                                  }
                                }}
                              >
                                <i
                                  data-state={
                                    item.health !== "healthy"
                                      ? item.health
                                      : isStale(item)
                                        ? "stale"
                                        : "healthy"
                                  }
                                />
                              </button>
                              <span className="status-tooltip">
                                <span id={`status-${item.id}`} role="tooltip">
                                  {item.reason ?? (isStale(item) ? "Stale observation" : "Healthy")}
                                  {item.reason && isStale(item) ? " · stale" : ""}
                                </span>
                                {!metrics(item).length && (
                                  <button
                                    className="status-details"
                                    onClick={(event) => {
                                      const trigger =
                                        event.currentTarget.parentElement?.previousElementSibling;
                                      if (trigger instanceof HTMLElement) trigger.focus();
                                      setStatusOpen(null);
                                      open(item.id, document.activeElement as HTMLElement);
                                    }}
                                  >
                                    Service details
                                  </button>
                                )}
                              </span>
                            </div>
                          </div>
                          {metrics(item).length > 0 && (
                            <button
                              className="service-details"
                              aria-label={`Details for ${item.name}`}
                              onClick={(e) => open(item.id, e.currentTarget)}
                            >
                              <span
                                className="metrics"
                                data-count={Math.min(metrics(item).length, 4)}
                              >
                                {metrics(item)
                                  .slice(0, 4)
                                  .map((metric, mi) => (
                                    <span className="metric" key={metric.id}>
                                      <strong>
                                        <MetricValue
                                          value={
                                            scenario === "stress" && mi === 0
                                              ? "999.9M"
                                              : metric.displayValue
                                          }
                                        />
                                      </strong>
                                      <span>{metric.label}</span>
                                    </span>
                                  ))}
                              </span>
                              <ChevronRight size={14} className="detail-chevron" />
                            </button>
                          )}
                          {draft && (
                            <div className="tile-arrange">
                              <button
                                draggable={!saving}
                                disabled={saving}
                                onDragStart={(e) => {
                                  setDragged(item.id);
                                  e.dataTransfer.setData("text/plain", item.id);
                                }}
                                onDragEnd={() => setDragged(null)}
                                aria-label={`Drag ${item.name}`}
                              >
                                <GripVertical size={16} />
                              </button>
                              <button
                                aria-label={`Move ${item.name} up`}
                                disabled={saving || idx === 0}
                                onClick={() => move(item.id, -1)}
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                aria-label={`Move ${item.name} down`}
                                disabled={saving || idx === groupItems.length - 1}
                                onClick={() => move(item.id, 1)}
                              >
                                <ArrowDown size={16} />
                              </button>
                              <select
                                aria-label={`Group for ${item.name}`}
                                value={item.group}
                                disabled={saving}
                                onChange={(e) =>
                                  setDraft(
                                    draft.map((i) =>
                                      i.id === item.id ? { ...i, group: e.target.value } : i,
                                    ),
                                  )
                                }
                              >
                                {activeGroups.map((g) => (
                                  <option key={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    {!groupItems.length && <p className="empty-group">Move a service here</p>}
                  </section>
                );
              })}
          </div>
          {!filtered.length && (
            <div className="empty-results">
              <Search size={24} />
              <h2>No matching services</h2>
              <p>Try a service name, type, or group.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setGroupFilter("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <footer className="footer">
            <span>Design preview · synthetic observations</span>
          </footer>
        </main>
      )}
      <dialog
        ref={dialog}
        aria-label={service ? `${service.name} details` : "Service details"}
        className="detail-panel"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) {
            const r = dialog.current.getBoundingClientRect();
            if (e.clientX < r.left) close();
          }
        }}
      >
        {service && (
          <>
            <header className="detail-header">
              <span className="eyebrow">{service.group} / SERVICE DETAILS</span>
              <button autoFocus className="icon-button" aria-label="Close details" onClick={close}>
                <X size={20} />
              </button>
            </header>
            <div className="detail-title">
              <Icon service={service} />
              <div>
                <h2>{displayName(service)}</h2>
                <p>
                  <i data-state={service.health} />
                  {service.reason ?? "Healthy"}
                  {isStale(service) ? " · stale observation" : " · observed 8 seconds ago"}
                </p>
              </div>
            </div>
            <a className="open-app" href={service.href} target="_blank" rel="noreferrer">
              Open {service.name}
              <ArrowUpRight size={17} />
            </a>
            <div className="detail-tabs" role="tablist" aria-label="Service detail sections">
              {["Overview", "History", "Settings"].map((t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  tabIndex={tab === t ? 0 : -1}
                  aria-controls="detail-tab-content"
                  key={t}
                  onClick={() => setTab(t)}
                  onKeyDown={(event) => {
                    const tabs = ["Overview", "History", "Settings"];
                    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 2
                          : (tabs.indexOf(t) + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                    setTab(tabs[next]);
                    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div id="detail-tab-content" className="detail-body" role="tabpanel" aria-label={tab}>
              {tab === "Overview" && (
                <>
                  <h3>Selected metrics</h3>
                  <div className="detail-metrics">
                    {metrics(service).map((m) => (
                      <div key={m.id}>
                        <span>{m.label}</span>
                        <strong>{m.displayValue}</strong>
                      </div>
                    ))}
                  </div>
                  {!metrics(service).length && (
                    <p>No metrics selected. This service is available as a launcher.</p>
                  )}
                  <h3>Activity</h3>
                  {scenario === "idle" || scenario === "disconnected" ? (
                    <p>
                      {scenario === "idle"
                        ? "No current activity."
                        : "Activity unavailable until connection recovers."}
                    </p>
                  ) : (
                    activity
                      .filter((a) => a.source === service.id)
                      .map((a) => (
                        <div className="detail-activity" key={a.id}>
                          <strong>{a.title}</strong>
                          <span>{a.subtitle}</span>
                          <span>
                            {a.activity} {a.speed ? `· ${a.speed}` : ""}
                          </span>
                        </div>
                      ))
                  )}
                  {!activity.some((a) => a.source === service.id) && (
                    <p>No current activity reported.</p>
                  )}
                  <h3>Connection diagnostics</h3>
                  <dl>
                    <dt>Service type</dt>
                    <dd>{service.type}</dd>
                    <dt>Endpoint</dt>
                    <dd>{service.href}</dd>
                    <dt>Observation</dt>
                    <dd>{isStale(service) ? "12 minutes ago · stale" : "8 seconds ago"}</dd>
                    <dt>Response</dt>
                    <dd>{service.reason ?? "Successful"}</dd>
                  </dl>
                  <p className="preview-note">
                    Illustrative diagnostics from the shared fixture; no service requests are made.
                  </p>
                </>
              )}
              {tab === "History" && (
                <>
                  <h3>Observation history</h3>
                  <div className="history-ranges">
                    {["1h", "6h", "24h"].map((r) => (
                      <button key={r} aria-pressed={r === range} onClick={() => setRange(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="history-empty">
                    <RotateCcw size={24} />
                    <h3>No recorded observations</h3>
                    <p>
                      This design fixture contains current values only. No historical measurements
                      have been invented for the last {range}.
                    </p>
                  </div>
                </>
              )}
              {tab === "Settings" && (
                <>
                  <h3>Identity</h3>
                  <label>
                    Service name
                    <input
                      value={service.name}
                      disabled={saving || !!draft}
                      onChange={(e) => {
                        const update = (list: Service[]) =>
                          list.map((i) =>
                            i.id === service.id ? { ...i, name: e.target.value } : i,
                          );
                        if (draft) setDraft(update(draft));
                        else setItems(update(items));
                      }}
                    />
                  </label>
                  <h3>Connection</h3>
                  <p>{service.href}</p>
                  <p className="preview-note">
                    Connection editing is outside this visual prototype. No credentials are loaded.
                  </p>
                  <h3>Metrics</h3>
                  <p>First four appear on the dashboard. Additional selections stay in details.</p>
                  {service.metrics.map((m, index) => (
                    <div className="metric-setting" key={m.id}>
                      <span>{m.label}</span>
                      <button
                        disabled={saving || index === 0}
                        aria-label={`Move ${m.label} earlier`}
                        onClick={() => {
                          const list = [...service.metrics];
                          [list[index - 1], list[index]] = [list[index], list[index - 1]];
                          updateMetrics(service.id, list);
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        disabled={saving || !!draft}
                        aria-label={`Hide ${m.label}`}
                        onClick={() => {
                          setUnused((old) => ({
                            ...old,
                            [service.id]: [...(old[service.id] ?? []), m],
                          }));
                          updateMetrics(
                            service.id,
                            service.metrics.filter((metric) => metric.id !== m.id),
                          );
                        }}
                      >
                        Hide
                      </button>
                    </div>
                  ))}
                  <h3>Unused</h3>
                  {(unused[service.id] ?? []).length === 0 && <p>No hidden metrics.</p>}
                  {(unused[service.id] ?? []).map((m) => (
                    <div className="metric-setting" key={m.id}>
                      <span>{m.label}</span>
                      <button
                        disabled={saving || !!draft}
                        aria-label={`Show ${m.label}`}
                        onClick={() => {
                          updateMetrics(service.id, [...service.metrics, m]);
                          setUnused((old) => ({
                            ...old,
                            [service.id]: old[service.id].filter((metric) => metric.id !== m.id),
                          }));
                        }}
                      >
                        Show
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
function ReferenceBoard() {
  return (
    <main className="reference-board">
      <div className="eyebrow">DESIGN RESEARCH / TRANSFERABLE IDEAS</div>
      <h1>Function, with character.</h1>
      <p>
        Two interpretations of the same dashboard. These studies borrow principles, not branded
        components.
      </p>
      <div className="reference-grid">
        {[
          [
            "01",
            "Vercel · Geist",
            "https://vercel.com/geist/introduction",
            "Clear hierarchy at small scales",
            "Use a consistent type scale, neutral surfaces, and unmistakable focused and selected controls. Keep technical numbers tabular. Avoid copying the pure-black canvas.",
            "Aa",
            "type",
          ],
          [
            "02",
            "teenage engineering · OP–1 field",
            "https://teenage.engineering/guides/op-1",
            "A precise, tactile instrument",
            "Group related functions, use colour sparingly, and give controls a physical sense of placement. Translate material restraint into warm graphite and porcelain, not ornamental knobs.",
            "● ● ● ●",
            "instrument",
          ],
          [
            "03",
            "Nothing",
            "https://nothing.tech",
            "Identity through repetition",
            "Create a recognisable rhythm through type, numbering, and consistent details. Keep data labels readable; do not borrow the dot-matrix font or decorative glyphs.",
            "01 / 02",
            "identity",
          ],
          [
            "04",
            "Homarr + Homepage",
            "https://homarr.dev",
            "A dashboard earns its space",
            "Keep real service identities and useful activity visible. Downloads, streams, and exceptions deserve more emphasis than healthy status decoration. Preserve ordering and source attribution.",
            "↑ 12.4 MB/s",
            "data",
          ],
        ].map(([n, title, url, headline, note, sample, cls]) => (
          <article key={n}>
            <div className={`reference-sample ${cls}`}>{sample}</div>
            <small>{n} / REFERENCE</small>
            <h2>
              <a href={url} target="_blank" rel="noreferrer">
                {title} ↗
              </a>
            </h2>
            <h3>{headline}</h3>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <p>
        Reference samples above are our typographic studies, not screenshots of the source products.
        Additional operational reference:{" "}
        <a href="https://gethomepage.dev/" target="_blank" rel="noreferrer">
          Homepage
        </a>
        .
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
