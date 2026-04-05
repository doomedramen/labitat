import type { FieldDef } from "./types"

/** Config fields shared by all Glances-backed adapters */
export const GLANCES_BASE_FIELDS: FieldDef[] = [
  {
    key: "url",
    label: "Glances URL",
    type: "url",
    required: true,
    placeholder: "http://localhost:61208",
  },
  {
    key: "username",
    label: "Username",
    type: "text",
    required: false,
    placeholder: "admin",
    helperText: "Optional – only if authentication is enabled",
  },
  {
    key: "password",
    label: "Password",
    type: "password",
    required: false,
    placeholder: "password",
    helperText: "Optional – only if authentication is enabled",
  },
]

/** Build an authenticated Glances API fetch helper from a config object */
export function makeGlancesGet(config: Record<string, string>) {
  const baseUrl = config.url.replace(/\/$/, "")
  const version = config.version || "4"
  const headers: HeadersInit = { Accept: "application/json" }

  if (config.username && config.password) {
    const credentials = btoa(`${config.username}:${config.password}`)
    headers.Authorization = `Basic ${credentials}`
  }

  return async (path: string) => {
    const res = await fetch(`${baseUrl}/api/${version}/${path}`, { headers })
    if (!res.ok) {
      if (res.status === 401) throw new Error("Authentication failed")
      if (res.status === 404) throw new Error("Glances API not found")
      throw new Error(`Glances error: ${res.status}`)
    }
    return res.json()
  }
}
