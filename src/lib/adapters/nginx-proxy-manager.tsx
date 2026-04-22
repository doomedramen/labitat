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

interface CachedCookie {
  cookie: string;
  expiresAt: number;
}

export const cookieCache = new Map<string, CachedCookie>();

function getCachedCookie(cacheKey: string): string | null {
  const cached = cookieCache.get(cacheKey);
  if (!cached) return null;

  const refreshAt = cached.expiresAt - 5 * 60 * 1000;
  if (Date.now() > refreshAt) {
    cookieCache.delete(cacheKey);
    return null;
  }

  return cached.cookie;
}

function setCachedCookie(cacheKey: string, cookie: string, expiresIn: number): void {
  cookieCache.set(cacheKey, {
    cookie,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}

/**
 * Extracts the token cookie from Set-Cookie header
 * NPM returns the token in a Set-Cookie header like:
 * token=s%3AeyJhbGciOiJSUzI1NiIs...; Path=/api; Expires=...; HttpOnly; Secure; SameSite=Strict
 */
function extractTokenCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;

  // Handle multiple Set-Cookie headers (joined by comma in fetch)
  const cookies = setCookieHeader.split(",");

  for (const cookie of cookies) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) {
      // URL decode the cookie value (s%3A becomes s:)
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Parses expiration date from Set-Cookie header
 */
function parseCookieExpiration(setCookieHeader: string | null): number {
  if (!setCookieHeader) return 3600;

  const expiresMatch = setCookieHeader.match(/Expires=([^;]+)/);
  if (expiresMatch) {
    const expiresDate = new Date(expiresMatch[1]);
    const expiresIn = Math.floor((expiresDate.getTime() - Date.now()) / 1000);
    return expiresIn > 0 ? expiresIn : 3600;
  }

  return 3600;
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

    let cookie = getCachedCookie(cacheKey);

    if (!cookie) {
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

      // NPM returns the token in Set-Cookie header, not JSON body
      const setCookie = loginRes.headers.get("Set-Cookie");
      const tokenValue = extractTokenCookie(setCookie);

      if (!tokenValue) {
        // Check JSON body for error messages or 2FA challenge
        const tokenData = await loginRes.json().catch(() => null);

        if (tokenData?.requires_2fa) {
          throw new Error(
            "NPM login failed: Two-factor authentication (2FA) is required. Please disable 2FA for this account.",
          );
        }

        const errorMsg = tokenData?.error || tokenData?.message;
        if (errorMsg) {
          throw new Error(`NPM login failed: ${errorMsg}`);
        }

        throw new Error(`NPM login failed: no token cookie in response. Set-Cookie: ${setCookie}`);
      }

      // Build the full cookie string for the header
      cookie = `token=${tokenValue}`;

      // Parse expiration from the Set-Cookie header
      const expiresIn = parseCookieExpiration(setCookie);
      setCachedCookie(cacheKey, cookie, expiresIn);
    }

    const headers = { Cookie: cookie };

    async function fetchWithRetry(url: string): Promise<NginxProxyHost[]> {
      const res = await fetchWithTimeout(url, { headers, insecure });

      if (res.status === 403) {
        cookieCache.delete(cacheKey);

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

        const setCookie = loginRes.headers.get("Set-Cookie");
        const tokenValue = extractTokenCookie(setCookie);

        if (!tokenValue) {
          const tokenData = await loginRes.json().catch(() => null);

          if (tokenData?.requires_2fa) {
            throw new Error(
              "NPM login failed: Two-factor authentication (2FA) is required. Please disable 2FA for this account.",
            );
          }

          const errorMsg = tokenData?.error || tokenData?.message;
          if (errorMsg) {
            throw new Error(`NPM login failed: ${errorMsg}`);
          }

          throw new Error(
            `NPM login failed: no token cookie in response. Set-Cookie: ${setCookie}`,
          );
        }

        cookie = `token=${tokenValue}`;
        const expiresIn = parseCookieExpiration(setCookie);
        setCachedCookie(cacheKey, cookie, expiresIn);

        const retryHeaders = { Cookie: cookie };
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
