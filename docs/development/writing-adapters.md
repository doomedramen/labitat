# Writing Service Adapters

Service adapters connect your dashboard to external services (Glances, Radarr, Plex, etc.).
Each adapter defines: **config fields** (shown in the UI), **data fetching** (server-side), and a **widget** (rendered on the dashboard).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User fills config form → Server Action saves encrypted     │
│  config to SQLite (configEnc column)                        │
├─────────────────────────────────────────────────────────────┤
│  Polling: fetchServiceData() decrypts config → calls        │
│  adapter.fetchData(config) → returns data → Widget renders  │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

### Simple adapters (server-side widget)

Single file. No `"use client"` directive.

```
src/lib/adapters/radarr.tsx    ← configFields + fetchData + Widget
```

### Adapters with client-side widgets

**Split into two files** to keep the adapter definition importable on the server:

```
src/lib/adapters/glances-timeseries.tsx       ← adapter definition (NO "use client")
src/lib/adapters/glances-timeseries-widget.tsx ← Widget component ("use client")
```

> **⚠️ CRITICAL:** If your adapter file has `"use client"` at the top, the server action
> `buildServiceConfig()` will NOT be able to import it — `getService()` will return
> `undefined`, and **config will NOT be saved**. This is a silent failure.
>
> **Rule:** If your Widget uses React hooks (`useState`, `useEffect`, etc.), put the
> Widget in a separate `-widget.tsx` file with `"use client"`, and keep the adapter
> definition (configFields + fetchData) in the main file without `"use client"`.

## Adapter Definition Template

```tsx
// src/lib/adapters/my-service.tsx  ← NO "use client"

import type { ServiceDefinition } from "./types";
import { MyServiceWidget } from "./my-service-widget"; // if client-side

// ── Data shape ──────────────────────────────────────────────

type MyServiceData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  // Your widget data fields here
  count: number;
  status: string;
};

// ── Adapter definition ──────────────────────────────────────

export const myServiceDefinition: ServiceDefinition<MyServiceData> = {
  id: "my-service",
  name: "My Service",
  icon: "my-service", // selfh.st slug or full URL
  category: "monitoring", // see types below
  defaultPollingMs: 10_000, // optional, defaults to 10s

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://myservice.home.lab:8080",
      helperText: "The base URL of your service",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your API key",
      helperText: "Found in Settings → API",
    },
    // type: "text" | "url" | "password" | "number" | "select" | "boolean"
  ],

  async fetchData(config) {
    // config is Record<string, string> — all values are strings
    const baseUrl = config.url.replace(/\/$/, "");
    const headers = { "X-Api-Key": config.apiKey };

    const res = await fetch(`${baseUrl}/api/status`, { headers });
    if (!res.ok) throw new Error(`Error: ${res.status}`);

    const data = await res.json();

    return {
      _status: "ok" as const,
      count: data.count ?? 0,
      status: data.status ?? "unknown",
    };
  },

  Widget: MyServiceWidget,
};
```

## Client-Side Widget Template

```tsx
// src/lib/adapters/my-service-widget.tsx  ← "use client" REQUIRED

"use client";

import { useEffect, useState } from "react";
import type { MyServiceData } from "./my-service";

export function MyServiceWidget({ count, status }: MyServiceData) {
  const [localState, setLocalState] = useState(count);

  useEffect(() => {
    setLocalState(count);
  }, [count]);

  return (
    <div>
      {localState} items — {status}
    </div>
  );
}
```

## Config Field Types

| Type       | UI Component              | Form Submission | Notes                                                  |
| ---------- | ------------------------- | --------------- | ------------------------------------------------------ |
| `url`      | `<input type="url">`      | ✅ Native       | Stored in both `configEnc` and `serviceUrl`            |
| `password` | `<input type="password">` | ✅ Native       | Only stored if non-empty (won't overwrite on edit)     |
| `text`     | `<input type="text">`     | ✅ Native       |                                                        |
| `number`   | `<input type="number">`   | ✅ Native       | Value is still a string in `config`                    |
| `select`   | Base UI `<Select>`        | ⚠️ Hidden input | `FieldRenderer` adds a hidden `<input>` automatically  |
| `boolean`  | Base UI `<Switch>`        | ⚠️ State-based  | `item-dialog.tsx` reads from React state, not FormData |

### Important: Select Fields

The Base UI `<Select>` component does **not** submit values through native forms.
The `FieldRenderer` component automatically adds a hidden `<input>` to bridge this gap.
No extra work needed — just define the field with `type: "select"` and `options`.

### Important: Boolean Fields

The Base UI `<Switch>` component also doesn't submit natively. The `item-dialog.tsx`
handles this by reading boolean values from React state and injecting them into
`FormData` before submission. Define with `type: "boolean"` — no extra work needed.

## Registering Your Adapter

1. Add the import to `src/lib/adapters/index.ts`
2. Add to the `registry` object

```ts
// src/lib/adapters/index.ts

import { myServiceDefinition } from "./my-service";

export const registry = {
  // ... existing entries
  [myServiceDefinition.id]: myServiceDefinition,
};
```

## Service Categories

Used for grouping in the UI:
`"media" | "downloads" | "networking" | "monitoring" | "storage" | "automation" | "security" | "finance" | "productivity" | "info"`

## Common Patterns

### Shared config fields (like Glances variants)

```ts
// src/lib/adapters/glances-common.ts
export const GLANCES_BASE_FIELDS: FieldDef[] = [
  { key: "url", label: "Glances URL", type: "url", required: true, ... },
  { key: "username", label: "Username", type: "text", ... },
  { key: "password", label: "Password", type: "password", ... },
]

export function makeGlancesGet(config: Record<string, string>) {
  // Returns an async (path) => json fetch helper
}
```

Then in each variant:

```ts
configFields: [
  ...GLANCES_BASE_FIELDS,
  { key: "metric", label: "Metric", type: "select", options: [...] },
],
```

### fetchData error handling

Throw descriptive errors — they become `_statusText` in the UI:

```ts
if (!res.ok) {
  if (res.status === 401) throw new Error("Invalid API key");
  if (res.status === 404) throw new Error("Service not found");
  throw new Error(`Service error: ${res.status}`);
}
```

## Checklist Before Merging

- [ ] Adapter definition file does **NOT** have `"use client"` (unless it has no configFields/fetchData)
- [ ] Widget is in a separate file with `"use client"` if it uses React hooks
- [ ] Registered in `src/lib/adapters/index.ts`
- [ ] `id` is unique and kebab-case
- [ ] `configFields` covers all required inputs
- [ ] `fetchData` handles errors gracefully (401, 404, network errors)
- [ ] Widget handles empty/undefined data gracefully
