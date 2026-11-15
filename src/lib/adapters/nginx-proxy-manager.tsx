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

/** How a logged-in session authenticates later requests. */
type Session = { headers: Record<string, string>; expiresAt: number };

/** Sessions per URL and account; exported so tests can reset it. */
export const cookieCache = new Map<string, Session>();

function cachedSession(cacheKey: string): Session | null {
  const session = cookieCache.get(cacheKey);
  if (!session) return null;
  // Log in again five minutes before the session would expire.
  if (Date.now() > session.expiresAt - 5 * 60 * 1000) {
    cookieCache.delete(cacheKey);
    return null;
  }
  return session;
}

/** Login cookie names, most specific first: NPMplus, then older cookie-based releases. */
const TOKEN_COOKIES = ["__Host-Http-token", "token"];
/** NPMplus sets this instead of a session when the account needs a 2FA code. */
const CHALLENGE_COOKIE = "__Host-Http-challenge_token";

type Cookie = { name: string; value: string; expiresAt: number | null };

/**
 * Every Set-Cookie header on a response. `getSetCookie()` keeps them apart; the joined
 * fallback is split only before a new `name=`, since Expires dates contain commas.
 */
function setCookies(headers: Headers): Cookie[] {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : (headers.get("set-cookie") ?? "").split(/,(?=\s*[^;,=\s]+=)/);
  return raw.flatMap((line) => {
    const [pair, ...attributes] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 1) return [];
    let expiresAt: number | null = null;
    for (const attribute of attributes) {
      const [key, ...rest] = attribute.trim().split("=");
      const value = rest.join("=");
      if (/^max-age$/i.test(key) && Number.isFinite(Number(value)))
        expiresAt = Date.now() + Number(value) * 1000;
      else if (/^expires$/i.test(key) && expiresAt === null) {
        const at = Date.parse(value);
        if (Number.isFinite(at)) expiresAt = at;
      }
    }
    return [{ name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim(), expiresAt }];
  });
}

const DEFAULT_SESSION_MS = 60 * 60 * 1000;

/**
 * Logs in to `/api/tokens`. Nginx Proxy Manager returns the token in the JSON body and
 * expects `Authorization: Bearer`; NPMplus sets a signed `__Host-Http-token` cookie that
 * must be sent back under the same name.
 */
async function login(
  baseUrl: string,
  email: string,
  password: string,
  insecure: boolean,
): Promise<Session> {
  const res = await fetchWithTimeout(`${baseUrl}/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, secret: password }),
    insecure,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`NPM login failed (${res.status}): ${errorText || "Unknown error"}`);
  }
  const cookies = setCookies(res.headers);
  const body = (await res.json().catch(() => null)) as {
    token?: unknown;
    expires?: unknown;
    requires_2fa?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (body?.requires_2fa || cookies.some((cookie) => cookie.name === CHALLENGE_COOKIE)) {
    throw new Error(
      "NPM login failed: Two-factor authentication (2FA) is required. Please disable 2FA for this account.",
    );
  }
  const cookie = TOKEN_COOKIES.map((name) => cookies.find((c) => c.name === name)).find(Boolean);
  if (cookie) {
    return {
      headers: { Cookie: `${cookie.name}=${cookie.value}` },
      expiresAt: cookie.expiresAt ?? Date.now() + DEFAULT_SESSION_MS,
    };
  }
  if (typeof body?.token === "string" && body.token) {
    const expires = typeof body.expires === "string" ? Date.parse(body.expires) : NaN;
    return {
      headers: { Authorization: `Bearer ${body.token}` },
      expiresAt: Number.isFinite(expires) ? expires : Date.now() + DEFAULT_SESSION_MS,
    };
  }
  const message = body?.error || body?.message;
  throw new Error(
    message
      ? `NPM login failed: ${typeof message === "string" ? message : JSON.stringify(message)}`
      : "NPM login failed: no session token in the response",
  );
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

    async function session(fresh = false) {
      const cached = fresh ? null : cachedSession(cacheKey);
      if (cached) return cached;
      const created = await login(baseUrl, config.email, config.password, insecure);
      cookieCache.set(cacheKey, created);
      return created;
    }

    const url = `${baseUrl}/api/nginx/proxy-hosts`;
    let res = await fetchWithTimeout(url, { headers: (await session()).headers, insecure });
    // A session the server has dropped gets one fresh login before giving up.
    if (res.status === 401 || res.status === 403) {
      cookieCache.delete(cacheKey);
      res = await fetchWithTimeout(url, { headers: (await session(true)).headers, insecure });
    }
    if (!res.ok) throw new Error(`NPM proxy hosts error: ${res.status}`);

    const hosts = await res.json();
    if (!Array.isArray(hosts)) throw new Error("NPM invalid proxy hosts response");
    return { _status: "ok", hosts };
  },
  toPayload: nginxProxyManagerToPayload,
};
