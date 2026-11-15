import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, ChevronRight, Moon, Pause, Play, Search, Sun } from "lucide-react";
import { activity, groupNames, services, type Activity, type Service } from "./fixture";
import "./mockups.css";

// Static redesign mock-ups. Nothing here is wired to the application.
type Direction = "ledger" | "numerals" | "now";
const directions: { id: Direction; label: string; note: string; theme: "dark" | "light" }[] = [
  { id: "ledger", label: "A · Ledger", note: "Dense rows, healthy is silent", theme: "dark" },
  { id: "numerals", label: "B · Numerals", note: "One big number per service", theme: "dark" },
  { id: "now", label: "C · Now-first", note: "Activity rail, launcher grid", theme: "light" },
];

const downloads = activity.filter((entry) => entry.kind === "download");
const streams = activity.filter((entry) => entry.kind === "stream");
const problems = services.filter((service) => service.health !== "healthy");
const byGroup = groupNames.map((name) => ({
  name,
  items: services.filter((service) => service.group === name),
}));
const totalSpeed = downloads
  .reduce((sum, entry) => sum + (entry.speed?.endsWith("MB/s") ? parseFloat(entry.speed) : 0), 0)
  .toFixed(1);
const sourceName = (id: string) => services.find((service) => service.id === id)?.name ?? id;
const percent = (value: string) => {
  const match = /^(\d+(?:\.\d+)?)%$/.exec(value);
  return match ? Number(match[1]) : null;
};
const service = (id: string) => services.find((entry) => entry.id === id)!;

function Icon({ item, size }: { item: Service; size: number }) {
  const [failed, setFailed] = useState(false);
  return item.icon && !failed ? (
    <img
      className="icon"
      src={`https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${item.icon}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="icon letter" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {item.name[0]}
    </span>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <span className="meter" role="img" aria-label={`${value}%`}>
      <span style={{ width: `${Math.min(100, value)}%` }} />
    </span>
  );
}

function Progress({ entry }: { entry: Activity }) {
  return entry.progress === undefined ? null : (
    <span className="progress" role="progressbar" aria-valuenow={entry.progress}>
      <span style={{ width: `${entry.progress}%` }} />
    </span>
  );
}

/* A · Ledger: one line per service; only problems and activity earn extra ink. */
function Ledger() {
  return (
    <div className="ledger">
      <header className="l-top">
        <span className="l-brand">labitat</span>
        <label className="l-search">
          <Search size={14} aria-hidden="true" />
          <input placeholder="Find a service" aria-label="Find a service" />
          <kbd>/</kbd>
        </label>
        <p className="l-summary">
          <b>{services.length}</b> services <i /> <b className="warn">{problems.length}</b> need
          attention <i /> <span className="live">Live</span>
        </p>
      </header>

      <section className="l-attention" aria-label="Needs attention">
        <h2>Needs attention</h2>
        <ul>
          {problems.map((item) => (
            <li key={item.id} data-health={item.health}>
              <Icon item={item} size={18} />
              <strong>{item.name}</strong>
              <span>{item.reason}</span>
              <time>{item.stale ? "last seen 12m ago" : "just now"}</time>
              <ChevronRight size={14} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>

      <section className="l-now" aria-label="Now">
        {[
          { title: "Downloads", meta: `${downloads.length} · ${totalSpeed} MB/s`, rows: downloads },
          { title: "Streams", meta: `${streams.length} watching`, rows: streams },
        ].map((column) => (
          <div key={column.title}>
            <h2>
              {column.title} <span>{column.meta}</span>
            </h2>
            {column.rows.map((entry) => (
              <a className="l-entry" href="#" key={entry.id}>
                <span className="l-entry-title">
                  <strong>{entry.title}</strong> {entry.subtitle}
                </span>
                <span className="l-entry-meta">
                  {entry.kind === "stream" ? entry.viewer : (entry.speed ?? entry.activity)}
                </span>
                <span className="l-entry-time">
                  {entry.timeLeft ?? "—"}
                  {entry.kind === "download" && entry.timeLeft ? " left" : ""}
                </span>
                <Progress entry={entry} />
              </a>
            ))}
          </div>
        ))}
      </section>

      <div className="l-groups">
        {byGroup.map((group) => (
          <section key={group.name}>
            <h2>
              {group.name} <span>{group.items.length}</span>
            </h2>
            {group.items.map((item) => (
              <a className="l-row" href={item.href} key={item.id} data-health={item.health}>
                <Icon item={item} size={18} />
                <span className="l-name">{item.name}</span>
                {item.health === "healthy" ? (
                  <span className="l-metrics">
                    {item.metrics.slice(0, 3).map((metric) => (
                      <span key={metric.id}>
                        <b>{metric.displayValue}</b> {metric.label.toLowerCase()}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="l-reason">{item.reason}</span>
                )}
                <ArrowUpRight className="l-go" size={13} aria-hidden="true" />
              </a>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* B · Numerals: equal tiles, one hero number each; link-only services become chips. */
function Numerals() {
  return (
    <div className="numerals">
      <header className="n-top">
        <div>
          <h1>Labitat</h1>
          <p>
            {services.length - problems.length} of {services.length} services healthy
            <span className="warn"> · {problems.length} need attention</span>
          </p>
        </div>
        <label className="n-search">
          <Search size={16} aria-hidden="true" />
          <input placeholder="Find a service" aria-label="Find a service" />
        </label>
      </header>

      <section className="n-now" aria-label="Now">
        <div className="n-now-lead">
          <span className="n-hero">
            {totalSpeed}
            <small>MB/s</small>
          </span>
          <span className="n-sub">
            {downloads.length} downloads · {streams.length} streams
          </span>
        </div>
        <div className="n-now-list">
          {activity.map((entry) => (
            <a className="n-entry" href="#" key={entry.id}>
              <span className="n-entry-kind">
                {entry.kind === "stream" ? (
                  entry.activity === "Paused" ? (
                    <Pause size={12} />
                  ) : (
                    <Play size={12} />
                  )
                ) : null}
                {sourceName(entry.source)}
              </span>
              <strong>{entry.title}</strong>
              <span className="n-entry-sub">{entry.subtitle}</span>
              <Progress entry={entry} />
              <span className="n-entry-foot">
                <span>{entry.kind === "stream" ? entry.viewer : (entry.speed ?? "Queued")}</span>
                <span>{entry.progress === undefined ? "" : `${entry.progress}%`}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {byGroup.map((group) => {
        const tiles = group.items.filter((item) => item.metrics.length || item.reason);
        const chips = group.items.filter((item) => !item.metrics.length && !item.reason);
        return (
          <section className="n-group" key={group.name}>
            <h2>{group.name}</h2>
            <div className="n-grid">
              {tiles.map((item) => {
                const [lead, ...rest] = item.metrics;
                const leadPercent = lead ? percent(lead.displayValue) : null;
                return (
                  <a className="n-tile" href={item.href} key={item.id} data-health={item.health}>
                    <span className="n-tile-head">
                      <Icon item={item} size={20} />
                      <span>{item.name}</span>
                      {item.health !== "healthy" && <i className="n-dot" aria-hidden="true" />}
                    </span>
                    {item.health !== "healthy" ? (
                      <span className="n-problem">{item.reason}</span>
                    ) : (
                      <>
                        <span className="n-value">
                          {lead.displayValue}
                          <small>{lead.label}</small>
                        </span>
                        {leadPercent !== null && <Meter value={leadPercent} />}
                        <span className="n-rest">
                          {rest.slice(0, 3).map((metric) => (
                            <span key={metric.id}>
                              <b>{metric.displayValue}</b> {metric.label}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </a>
                );
              })}
            </div>
            {chips.length > 0 && (
              <div className="n-chips">
                {chips.map((item) => (
                  <a href={item.href} key={item.id}>
                    <Icon item={item} size={16} />
                    {item.name}
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* C · Now-first: what is happening lives in a rail; services are a launcher. */
function NowFirst() {
  const vitals = [
    { item: service("catacomb"), metrics: ["cpu", "memory"] },
    { item: service("catacomb-2"), metrics: ["cpu", "memory"] },
    { item: service("catacomb-3"), metrics: ["cpu", "memory"] },
    { item: service("pve-ups"), metrics: ["battery", "load"] },
  ];
  return (
    <div className="now">
      <aside className="w-rail">
        <h1>Labitat</h1>
        <p className="w-date">Sunday 15 November · all times local</p>

        <section>
          <h2>Watching now</h2>
          {streams.map((entry) => (
            <a className="w-entry" href="#" key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{entry.viewer}</span>
              <Progress entry={entry} />
              <small>
                {entry.activity} · {entry.timeLeft}
              </small>
            </a>
          ))}
        </section>

        <section>
          <h2>
            Downloading <span>{totalSpeed} MB/s</span>
          </h2>
          {downloads.map((entry) => (
            <a className="w-entry" href="#" key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{entry.subtitle}</span>
              <Progress entry={entry} />
              <small>
                {sourceName(entry.source)} · {entry.timeLeft ? `${entry.timeLeft} left` : "queued"}
              </small>
            </a>
          ))}
        </section>

        <section>
          <h2>Needs attention</h2>
          <ul className="w-problems">
            {problems.map((item) => (
              <li key={item.id} data-health={item.health}>
                <strong>{item.name}</strong>
                <span>{item.reason}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Vitals</h2>
          <dl className="w-vitals">
            {vitals.map(({ item, metrics }) => (
              <div key={item.id}>
                <dt>{item.name}</dt>
                {metrics.map((id) => {
                  const metric = item.metrics.find((entry) => entry.id === id)!;
                  return (
                    <dd key={id}>
                      <span>{metric.label}</span>
                      <Meter value={percent(metric.displayValue) ?? 0} />
                      <b>{metric.displayValue}</b>
                    </dd>
                  );
                })}
              </div>
            ))}
          </dl>
        </section>
      </aside>

      <main className="w-main">
        <label className="w-search">
          <Search size={16} aria-hidden="true" />
          <input placeholder="Find a service" aria-label="Find a service" />
        </label>
        {byGroup.map((group) => (
          <section key={group.name}>
            <h2>{group.name}</h2>
            <div className="w-grid">
              {group.items.map((item) => (
                <a className="w-app" href={item.href} key={item.id} data-health={item.health}>
                  <span className="w-app-icon">
                    <Icon item={item} size={34} />
                  </span>
                  <span className="w-app-name">{item.name}</span>
                  <span className="w-app-meta">
                    {item.health !== "healthy"
                      ? item.reason
                      : item.metrics[0]
                        ? `${item.metrics[0].displayValue} ${item.metrics[0].label.toLowerCase()}`
                        : " "}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(location.search);
  const [direction, setDirection] = useState<Direction>(
    directions.find((entry) => entry.id === params.get("direction"))?.id ?? "ledger",
  );
  const preferred = directions.find((entry) => entry.id === direction)!.theme;
  const [theme, setTheme] = useState<"dark" | "light" | null>(
    params.get("theme") === "dark" || params.get("theme") === "light"
      ? (params.get("theme") as "dark" | "light")
      : null,
  );
  const active = theme ?? preferred;
  document.documentElement.dataset.direction = direction;
  document.documentElement.dataset.theme = active;
  const go = (next: Direction, nextTheme: "dark" | "light" | null) => {
    const url = new URL(location.href);
    url.searchParams.set("direction", next);
    if (nextTheme) url.searchParams.set("theme", nextTheme);
    else url.searchParams.delete("theme");
    history.replaceState(null, "", url);
    setDirection(next);
    setTheme(nextTheme);
  };
  return (
    <>
      <nav className="review" aria-label="Mock-up review controls (not part of the design)">
        <span>Mock-ups</span>
        {directions.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === direction}
            title={entry.note}
            onClick={() => go(entry.id, null)}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          aria-label={`Switch to ${active === "dark" ? "light" : "dark"} theme`}
          onClick={() => go(direction, active === "dark" ? "light" : "dark")}
        >
          {active === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </nav>
      {direction === "ledger" ? <Ledger /> : direction === "numerals" ? <Numerals /> : <NowFirst />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
