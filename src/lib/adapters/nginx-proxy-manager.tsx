import type { ServiceDefinition } from "./types";
import { Globe, ArrowRight, Wifi, Ban } from "lucide-react";

type NginxProxyManagerData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  hosts: number;
  redirHosts: number;
  streams: number;
  deadHosts: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function nginxProxyManagerToPayload(data: NginxProxyManagerData) {
  return {
    stats: [
      {
        id: "hosts",
        value: data.hosts,
        label: "Proxy Hosts",
        icon: Globe,
      },
      {
        id: "redirections",
        value: data.redirHosts,
        label: "Redirections",
        icon: ArrowRight,
      },
      {
        id: "streams",
        value: data.streams,
        label: "Streams",
        icon: Wifi,
      },
      {
        id: "disabled",
        value: data.deadHosts,
        label: "Disabled",
        icon: Ban,
      },
    ],
  };
}

function parseCount(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return (obj.data as unknown[]).length;
    if (typeof obj.total === "number") return obj.total;
  }
  return 0;
}

// ── Token caching ─────────────────────────────────────────────────────────────
// NPM tokens expire after 1 hour. We cache and refresh 5 minutes before expiry.

interface CachedToken {
  token: string;
  expiresAt: number; // timestamp in ms
}

export const tokenCache = new Map<string, CachedToken>();

/**
 * Get a cached token if it's still valid (with 5-minute pre-expiry buffer).
 */
function getCachedToken(cacheKey: string): string | null {
  const cached = tokenCache.get(cacheKey);
  if (!cached) return null;

  // Refresh 5 minutes before expiry
  const refreshAt = cached.expiresAt - 5 * 60 * 1000;
  if (Date.now() > refreshAt) {
    tokenCache.delete(cacheKey);
    return null;
  }

  return cached.token;
}

/**
 * Cache a token with its expiry time.
 */
function setCachedToken(cacheKey: string, token: string, expiresIn: number): void {
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + expiresIn * 1000, // convert seconds to ms
  });
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const nginxProxyManagerDefinition: ServiceDefinition<NginxProxyManagerData> = {
  id: "nginx-proxy-manager",
  name: "Nginx Proxy Manager",
  icon: "nginx-proxy-manager",
  category: "networking",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://npm.example.org",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
      required: true,
      placeholder: "admin@example.org",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your NPM password",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const cacheKey = `${baseUrl}:${config.email}`;

    // Try to get a cached token first
    let token = getCachedToken(cacheKey);

    // Login if no valid cached token
    if (!token) {
      const loginRes = await fetchWithTimeout(`${baseUrl}/api/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: config.email,
          secret: config.password,
        }),
      });

      if (!loginRes.ok) {
        const errorText = await loginRes.text().catch(() => loginRes.statusText);
        throw new Error(`NPM login failed (${loginRes.status}): ${errorText || "Unknown error"}`);
      }

      const tokenData = await loginRes.json();
      token = tokenData?.token;
      if (!token) throw new Error("NPM login failed: no token in response");

      // Cache token with its expiry time (NPM tokens expire in 1 hour)
      const expiresIn = tokenData?.expires ?? 3600; // default 1 hour if not specified
      setCachedToken(cacheKey, token, expiresIn);
    }

    const headers = { Authorization: `Bearer ${token}` };

    // Get counts with automatic retry on 403 (expired token)
    async function fetchWithRetry(url: string): Promise<number> {
      const res = await fetchWithTimeout(url, { headers });

      // If token expired, re-login and retry
      if (res.status === 403) {
        tokenCache.delete(cacheKey);

        const loginRes = await fetchWithTimeout(`${baseUrl}/api/tokens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: config.email,
            secret: config.password,
          }),
        });

        if (!loginRes.ok) {
          const errorText = await loginRes.text().catch(() => loginRes.statusText);
          throw new Error(`NPM login failed (${loginRes.status}): ${errorText || "Unknown error"}`);
        }

        const tokenData = await loginRes.json();
        token = tokenData?.token;
        if (!token) throw new Error("NPM login failed: no token in response");

        const expiresIn = tokenData?.expires ?? 3600;
        setCachedToken(cacheKey, token, expiresIn);

        const retryHeaders = { Authorization: `Bearer ${token}` };
        const retryRes = await fetchWithTimeout(url, {
          headers: retryHeaders,
        });
        return retryRes.ok ? parseCount(await retryRes.json()) : 0;
      }

      return res.ok ? parseCount(await res.json()) : 0;
    }

    // Fetch all counts in parallel
    const [hosts, redirHosts, streams, deadHosts] = await Promise.all([
      fetchWithRetry(`${baseUrl}/api/nginx/proxy-hosts`),
      fetchWithRetry(`${baseUrl}/api/nginx/redirection-hosts`),
      fetchWithRetry(`${baseUrl}/api/nginx/streams`),
      fetchWithRetry(`${baseUrl}/api/nginx/dead-hosts`),
    ]);

    return {
      _status: "ok",
      hosts,
      redirHosts,
      streams,
      deadHosts,
    };
  },
  toPayload: nginxProxyManagerToPayload,
};
