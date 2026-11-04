"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const destinations: Record<string, string> = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
  brave: "https://search.brave.com/search?q=",
  ecosia: "https://www.ecosia.org/search?q=",
  kagi: "https://kagi.com/search?q=",
};
export function WebSearch({ engines }: { engines: string }) {
  const available = engines
    .split(",")
    .map((name) => name.trim())
    .filter((name) => destinations[name.toLowerCase()]);
  const [engine, setEngine] = useState(available[0] ?? "Google");
  const [query, setQuery] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim())
          window.open(
            `${destinations[engine.toLowerCase()]}${encodeURIComponent(query.trim())}`,
            "_blank",
            "noopener,noreferrer",
          );
      }}
    >
      <label className="block text-sm">
        Search query
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the web…"
          required
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        Search engine
        <select
          className="h-9 rounded-md border border-input bg-card px-2"
          value={engine}
          onChange={(event) => setEngine(event.target.value)}
        >
          {(available.length ? available : ["Google"]).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={!query.trim()}>
        Search ↗
      </Button>
    </form>
  );
}
