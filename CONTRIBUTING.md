# Contributing to Labitat

Thank you for your interest in contributing to Labitat! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/labitat.git`
3. Install dependencies: `pnpm install`
4. Start development server: `pnpm dev`
5. Create a branch: `git checkout -b feature/your-feature`

## Development

### Requirements

- Node.js 20+
- pnpm 8+
- Git

### Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Run ESLint
pnpm format       # Format with Prettier
pnpm typecheck    # TypeScript type checking
pnpm db:push      # Push database schema changes
pnpm db:studio    # Open database GUI
```

### Pre-commit Hooks

We use Lefthook for pre-commit hooks:

- **Lint**: ESLint on staged TypeScript files
- **Format**: Prettier on staged files
- **Typecheck**: TypeScript compilation check
- **Commitlint**: Conventional commit message validation

Install hooks with:
```bash
pnpm add -D lefthook
pnpm lefthook install
```

## Adding a New Service Adapter

This is the most common contribution. The goal is **one file = one service**.

### Step 1: Create the Adapter File

Create `lib/adapters/your-service.tsx`:

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
      placeholder: 'http://192.168.1.1',
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

### Step 2: Register in index.ts

Add to `lib/adapters/index.ts`:

```typescript
import { yourServiceDefinition } from './your-service'

export const registry: ServiceRegistry = {
  // ...existing
  [yourServiceDefinition.id]: yourServiceDefinition,
}
```

### Adapter Checklist

- [ ] `id` is lowercase, hyphen-separated, unique
- [ ] `icon` matches a slug from [selfh.st/icons](https://selfh.st/icons)
- [ ] All sensitive fields use `type: 'password'` (auto-encrypted)
- [ ] `fetchData` throws descriptive `Error` on failure
- [ ] Widget handles loading/error states gracefully
- [ ] `defaultPollingMs` is sensible (most: 10000ms)

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

Breaking changes:
```
feat!: breaking change description

BREAKING CHANGE: description of the breaking change
```

The version is automatically bumped based on commit type:
- `feat` → minor version bump
- `fix` → patch version bump
- `BREAKING CHANGE` → major version bump

## Pull Request Process

1. Update documentation if needed
2. Test your changes thoroughly
3. Ensure all checks pass (lint, typecheck, build)
4. Create a PR with a clear description
5. Wait for review

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Checklist
- [ ] Code follows project guidelines
- [ ] Self-review completed
- [ ] Comments added where necessary
- [ ] Build passes locally
```

## Docker Development

Build and test locally:

```bash
docker build -t labitat:test .
docker run -p 3000:3000 -v $(pwd)/data:/data labitat:test
```

## Questions?

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Check [PROJECT_SPEC.md](./PROJECT_SPEC.md) for architecture details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
