import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, Moon, Pause, Play, Search, Sun } from "lucide-react";
import { activity, groupNames, services, type Activity, type Service } from "./fixture";
import "./mockups.css";

// Static redesign mock-ups. Nothing here is wired to the application.
type Direction = "numerals" | "compact" | "flow";
const directions: { id: Direction; label: string; note: string }[] = [
  { id: "numerals", label: "B · Numerals", note: "Round one, kept for comparison" },
  { id: "compact", label: "D · Compact", note: "B with activity as short filled rows" },
  { id: "flow", label: "E · Flow", note: "The dashboard as running text" },
];

const downloads = activity.filter((entry) => entry.kind === "download");
const streams = activity.filter((entry) => entry.kind === "stream");
// Alternate kinds so a short list still shows both downloads and streams.
const mixed = downloads
  .flatMap((entry, index) => [entry, streams[index]])
  .filter((entry): entry is Activity => !!entry);
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

/* B: activity as cards. */
function ActivityCards() {
  return (
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
  );
}

/* D: each entry is one short row whose background is its own progress bar. */
function ActivityRows() {
  const [all, setAll] = useState(false);
  return (
    <section className="d-now" aria-label="Now" data-all={all || undefined}>
      <p className="d-lead">
        <b>
          {totalSpeed}
          <small> MB/s</small>
        </b>
        <span>
          {downloads.length} downloads · {streams.length} streams
        </span>
      </p>
      <div className="d-rows">
        {mixed.map((entry) => (
          <a
            className="d-row"
            href="#"
            key={entry.id}
            style={{ "--p": `${entry.progress ?? 0}%` } as React.CSSProperties}
          >
            <span className="d-title">
              <strong>{entry.title}</strong> {entry.subtitle}
            </span>
            <span className="d-meta">
              {entry.kind === "stream" ? entry.viewer?.split(" · ")[0] : (entry.speed ?? "Queued")}
            </span>
            <span className="d-pct">
              {entry.progress === undefined ? "" : `${entry.progress}%`}
            </span>
          </a>
        ))}
      </div>
      <button type="button" className="d-more" onClick={() => setAll((value) => !value)}>
        {all ? "Show less" : `Show ${mixed.length - 3} more`}
      </button>
    </section>
  );
}

function Numerals({ compact }: { compact: boolean }) {
  return (
    <div className="numerals" data-compact={compact || undefined}>
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

      {compact ? <ActivityRows /> : <ActivityCards />}

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

/* E · Flow: the dashboard reads as text. Status is a sentence, services run inline. */
function Flow() {
  return (
    <div className="flow">
      <header className="f-top">
        <span className="f-brand">labitat</span>
        <label className="f-search">
          <Search size={15} aria-hidden="true" />
          <input placeholder="Find a service" aria-label="Find a service" />
        </label>
      </header>

      <h1 className="f-status">
        Everything is up except{" "}
        {problems.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (index === problems.length - 1 ? " and " : ", ")}
            <a href={item.href} data-health={item.health} title={item.reason}>
              {item.name}
            </a>
          </React.Fragment>
        ))}
        .
      </h1>

      <section className="f-now" aria-label="Now">
        <h2>
          Now <span>{totalSpeed} MB/s down</span>
        </h2>
        <p>
          {mixed.map((entry) => (
            <a href="#" key={entry.id} className="f-entry">
              <span
                className="f-entry-title"
                style={{ "--p": `${entry.progress ?? 0}%` } as React.CSSProperties}
              >
                {entry.title}
              </span>
              <span className="f-entry-meta">
                {entry.kind === "stream"
                  ? `${entry.viewer?.split(" · ")[0]} · ${entry.activity === "Paused" ? "paused" : `${entry.progress}%`}`
                  : entry.progress === undefined
                    ? "queued"
                    : `${entry.progress}% · ${entry.timeLeft}`}
              </span>
            </a>
          ))}
        </p>
      </section>

      {byGroup.map((group) => (
        <section className="f-group" key={group.name}>
          <h2>{group.name}</h2>
          <p>
            {group.items.map((item) => (
              <a className="f-item" href={item.href} key={item.id} data-health={item.health}>
                <Icon item={item} size={22} />
                <span className="f-name">{item.name}</span>
                {item.health !== "healthy" ? (
                  <span className="f-reason">{item.reason}</span>
                ) : (
                  item.metrics[0] && (
                    <span className="f-metric">
                      <b>{item.metrics[0].displayValue}</b> {item.metrics[0].label.toLowerCase()}
                    </span>
                  )
                )}
              </a>
            ))}
          </p>
        </section>
      ))}
    </div>
  );
}

function App() {
  const params = new URLSearchParams(location.search);
  const [direction, setDirection] = useState<Direction>(
    directions.find((entry) => entry.id === params.get("direction"))?.id ?? "compact",
  );
  const [theme, setTheme] = useState<"dark" | "light">(
    params.get("theme") === "light" ? "light" : "dark",
  );
  document.documentElement.dataset.direction = direction;
  document.documentElement.dataset.theme = theme;
  const go = (next: Direction, nextTheme: "dark" | "light") => {
    const url = new URL(location.href);
    url.searchParams.set("direction", next);
    url.searchParams.set("theme", nextTheme);
    history.replaceState(null, "", url);
    setDirection(next);
    setTheme(nextTheme);
  };
  return (
    <>
      <nav className="review" aria-label="Mock-up review controls (not part of the design)">
        {directions.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === direction}
            title={entry.note}
            onClick={() => go(entry.id, theme)}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          onClick={() => go(direction, theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </nav>
      {direction === "flow" ? <Flow /> : <Numerals compact={direction === "compact"} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
