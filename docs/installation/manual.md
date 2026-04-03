# Manual Setup

Install Labitat from source on any platform.

## Prerequisites

- Node.js 20+
- pnpm 8+

## Steps

```bash
# Clone the repository
git clone https://github.com/DoomedRamen/labitat.git
cd labitat

# Install dependencies
pnpm install

# Set up the database
pnpm db:push

# Build for production
pnpm build

# Start the server
pnpm start
```

## Environment

Copy `.env.example` to `.env` and configure your `SECRET_KEY`:

```bash
cp .env.example .env
openssl rand -base64 32  # Add this to .env as SECRET_KEY
```
