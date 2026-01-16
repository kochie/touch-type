# Development Guide

## Prerequisites

- Node.js 18+
- pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (required for local Supabase)

## Getting Started

```shell
pnpm install
```

## Local Supabase Development

### Starting Supabase Locally

```shell
supabase start
```

This will spin up a local Supabase instance with:
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Database**: localhost:54322
- **Inbucket (email testing)**: http://127.0.0.1:54324

### Stopping Supabase

```shell
supabase stop
```

### Database Migrations

Migrations are located in `supabase/migrations/`. To apply migrations:

```shell
supabase db reset
```

To create a new migration:

```shell
supabase migration new <migration_name>
```

### Edge Functions

Edge functions are located in `supabase/functions/`. Available functions:

| Function | Description |
|----------|-------------|
| `challenges` | Manage user typing challenges |
| `delete-user` | Handle user account deletion |
| `goals` | Manage user goals (speed, accuracy, practice, etc.) |
| `leaderboards` | Leaderboard score management |
| `recommendations` | AI-powered typing recommendations |

To serve functions locally:

```shell
supabase functions serve
```

To deploy a function:

```shell
supabase functions deploy <function_name>
```

### Generating TypeScript Types

To regenerate TypeScript types from the database schema:

```shell
supabase gen types typescript --local > renderer/src/types/supabase.ts
```

### Database Schema

The database includes the following tables:

- **profiles** - User metadata linked to auth.users
- **settings** - User preferences (keyboard, language, theme, etc.)
- **results** - Typing test results with key press data
- **goals** - User goals with requirements
- **challenges** - User typing challenges
- **leaderboard_scores** - Public leaderboard entries
- **subscriptions** - Billing/subscription information

All tables have Row Level Security (RLS) enabled.

## Running the App

### Development Mode (Next.js only)

```shell
pnpm dev:next
```

### Development Mode (Electron)

```shell
pnpm dev
```

### Build

```shell
pnpm build
```

## Creating a Release

To create a beta version:

```shell
pnpm version prerelease --preid beta 
git push --tags
```

This will start the GH Action for releases and create a draft release with the tag.

## CI/CD Supabase Deployment

The `.github/workflows/supabase-deploy.yml` workflow automatically deploys Supabase changes on release. It:

1. Pushes database migrations to production
2. Deploys all edge functions

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token from [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password for the production project |
| `SUPABASE_PROJECT_ID` | Project reference ID (found in Project Settings > General) |

### Manual Deployment

You can also trigger the workflow manually from the Actions tab using `workflow_dispatch`.
