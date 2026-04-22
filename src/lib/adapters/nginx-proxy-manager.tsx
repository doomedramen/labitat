import type { ServiceDefinition } from "./types";
import { Globe, Ban } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";

type NginxProxyManagerData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  hosts?: NginxProxyHost[];
};

type NginxProxyHost = {
  id: number;
  enabled: boolean | number;
  domain_names?: string[];
  forwarding_domain?: string;
  [key: string]: unknown;
};

function nginxProxyManagerToPayload(data: NginxProxyManagerData) {
  const hosts = data.hosts ?? [];
  const enabled = hosts.filter((h) => !!h.enabled).length;
  const disabled = hosts.filter((h) => !h.enabled).length;
  const total = hosts.length;

  return {
    stats: [
      {
        id: "enabled",
        value: enabled,
        label: "Enabled",
        icon: Globe,
      },
      {
        id: "disabled",
        value: disabled,
        label: "Disabled",
        icon: Ban,
      },
      {
        id: "total",
        value: total,
        label: "Total",
        icon: Globe,
      },
    ],
  };
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

export const tokenCache = new Map<string, CachedToken>();

function getCachedToken(cacheKey: string): string | null {
  const cached = tokenCache.get(cacheKey);
  if (!cached) return null;

  const refreshAt = cached.expiresAt - 5 * 60 * 1000;
  if (Date.now() > refreshAt) {
    tokenCache.delete(cacheKey);
    return null;
  }

  return cached.token;
}

function setCachedToken(cacheKey: string, token: string, expiresIn: number): void {
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}

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
    {
      key: "insecure",
      label: "Skip TLS verification",
      type: "boolean",
      required: false,
      helperText: "Enable if using self-signed certificate",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const cacheKey = `${baseUrl}:${config.email}`;
    const insecure = config.insecure === "true";

    let token = getCachedToken(cacheKey);

    if (!token) {
      const loginRes = await fetchWithTimeout(`${baseUrl}/api/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: config.email,
          secret: config.password,
        }),
        insecure,
      });

      if (!loginRes.ok) {
        const errorText = await loginRes.text().catch(() => loginRes.statusText);
        throw new Error(`NPM login failed (${loginRes.status}): ${errorText || "Unknown error"}`);
      }

      const tokenData = await loginRes.json();
      token = tokenData?.token;
      if (!token) {
        throw new Error(
          `NPM login failed: no token in response. Response: ${JSON.stringify(tokenData)}`,
        );
      }

      // NPM returns expires as an ISO date string, not seconds
      let expiresIn: number;
      if (typeof tokenData?.expires === "string") {
        expiresIn = Math.floor((new Date(tokenData.expires).getTime() - Date.now()) / 1000);
      } else {
        expiresIn = tokenData?.expires ?? 3600;
      }
      setCachedToken(cacheKey, token, expiresIn);
    }

    const headers = { Authorization: `Bearer ${token}` };

    async function fetchWithRetry(url: string): Promise<NginxProxyHost[]> {
      const res = await fetchWithTimeout(url, { headers, insecure });

      if (res.status === 403) {
        tokenCache.delete(cacheKey);

        const loginRes = await fetchWithTimeout(`${baseUrl}/api/tokens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: config.email,
            secret: config.password,
          }),
          insecure,
        });

        if (!loginRes.ok) {
          const errorText = await loginRes.text().catch(() => loginRes.statusText);
          throw new Error(`NPM login failed (${loginRes.status}): ${errorText || "Unknown error"}`);
        }

        const tokenData = await loginRes.json();
        token = tokenData?.token;
        if (!token) {
          throw new Error(
            `NPM login failed: no token in response. Response: ${JSON.stringify(tokenData)}`,
          );
        }

        // NPM returns expires as an ISO date string, not seconds
        let expiresIn: number;
        if (typeof tokenData?.expires === "string") {
          expiresIn = Math.floor((new Date(tokenData.expires).getTime() - Date.now()) / 1000);
        } else {
          expiresIn = tokenData?.expires ?? 3600;
        }
        setCachedToken(cacheKey, token, expiresIn);

        const retryHeaders = { Authorization: `Bearer ${token}` };
        const retryRes = await fetchWithTimeout(url, {
          headers: retryHeaders,
          insecure,
        });

        if (!retryRes.ok) {
          return [];
        }

        const data = await retryRes.json();
        return Array.isArray(data) ? data : [];
      }

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }

    const hosts = await fetchWithRetry(`${baseUrl}/api/nginx/proxy-hosts`);

    return {
      _status: "ok",
      hosts,
    };
  },
  toPayload: nginxProxyManagerToPayload,
};
