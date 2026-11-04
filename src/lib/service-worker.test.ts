import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("service worker live API routing", () => {
  it.each(["/api/events", "/api/health", "/api/items/a/history?metric=cpu", "/?_rsc=next-payload"])(
    "keeps %s outside cached responses",
    async (pathname) => {
      const listeners = new Map<string, (event: unknown) => void>();
      const put = vi.fn();
      runInNewContext(readFileSync("public/sw.js", "utf8"), {
        self: {
          location: { origin: "http://localhost" },
          addEventListener: (name: string, listener: (event: unknown) => void) =>
            listeners.set(name, listener),
        },
        URL,
        Response,
        fetch: async () => new Response("test"),
        caches: { open: async () => ({ put, match: async () => undefined }) },
      });
      const promises: Promise<unknown>[] = [];
      const respondWith = vi.fn((promise: Promise<unknown>) => promises.push(promise));
      listeners.get("fetch")!({
        request: { url: `http://localhost${pathname}`, method: "GET" },
        respondWith,
      });
      await Promise.all(promises);
      expect(respondWith).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
    },
  );
});
