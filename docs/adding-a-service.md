# Adding a Service

The most common contribution. The goal is **one file = one service**.

## Step 1: Create the Adapter File

Create `src/lib/adapters/your-service.tsx`:

```typescript
import type { ServiceDefinition } from './types'

type YourServiceData = {
  _status?: 'ok' | 'warn' | 'error'
  _statusText?: string
  // Your data fields here
  example: number
}

function YourServiceWidget({ example }: YourServiceData) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
        <span className="tabular-nums font-medium text-foreground">{example}</span>
        <span className="text-muted-foreground">Example</span>
      </div>
    </div>
  )
}

export const yourServiceDefinition: ServiceDefinition<YourServiceData> = {
  id: 'your-service',
  name: 'Your Service',
  icon: 'your-service', // selfh.st slug
  category: 'monitoring', // or 'media', 'downloads', 'networking', etc.
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: 'url',
      label: 'URL',
      type: 'url',
      required: true,
      placeholder: 'http://10.0.0.1',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
    },
  ],

  async fetchData(config) {
    const res = await fetch(`${config.url}/api/endpoint`, {
      headers: { 'X-Api-Key': config.apiKey },
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid API key')
      if (res.status === 404) throw new Error('Service not found')
      throw new Error(`Service error: ${res.status}`)
    }

    const data = await res.json()

    return {
      _status: 'ok' as const,
      example: data.value ?? 0,
    }
  },

  Widget: YourServiceWidget,
}
```

## Step 2: Register in index.ts

Add to `src/lib/adapters/index.ts`:

```typescript
import { yourServiceDefinition } from "./your-service"

export const registry: ServiceRegistry = {
  // ...existing
  [yourServiceDefinition.id]: yourServiceDefinition,
}
```

## Adapter Checklist

- [ ] `id` is lowercase, hyphen-separated, unique
- [ ] `icon` matches a slug from [selfh.st/icons](https://selfh.st/icons)
- [ ] All sensitive fields use `type: 'password'` (auto-encrypted)
- [ ] `fetchData` throws descriptive `Error` on failure
- [ ] Widget handles loading/error states gracefully
- [ ] `defaultPollingMs` is sensible (most: 10000ms)

## Quick Scaffold

```bash
pnpm new-service
```

This scaffolds a service adapter and widget automatically.
