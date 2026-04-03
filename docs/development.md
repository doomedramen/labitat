# Development

Guide to developing Labitat locally.

## Requirements

- Node.js 20+
- pnpm 8+
- Git

## Getting Started

```bash
git clone https://github.com/DoomedRamen/labitat.git
cd labitat
pnpm install
pnpm dev
```

The development server starts at `http://localhost:3000`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm db:push` | Push database schema changes |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm test` | Run E2E tests (Playwright) |
| `pnpm test:ui` | Run tests with UI |

## Pre-commit Hooks

We use Lefthook for pre-commit hooks:

- **Lint**: ESLint on staged TypeScript files
- **Format**: Prettier on staged files
- **Typecheck**: TypeScript compilation check

Hooks are installed automatically with `pnpm install`.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── setup/             # First-run setup wizard
├── actions/               # Server actions
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── adapters/          # Service adapters (one file = one service)
│   └── ...                # Utilities
├── public/                # Static assets
├── scripts/               # Build and utility scripts
├── styles/                # Global styles
├── tests/                 # Playwright E2E tests
└── types/                 # TypeScript type definitions
```

## Docker Development

```bash
docker build -t labitat:test .
docker run -p 3000:3000 -v $(pwd)/data:/data labitat:test
```
