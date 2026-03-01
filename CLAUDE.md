# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
Multi-tenant bakery management app — recipes, ingredients, FIFO lot-based inventory, production sheets, vendors, equipment, and tagging.
Production URL: https://baker.dailygrains.co

## Tech Stack
- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- Clerk authentication (middleware-based, synced to DB via `getCurrentUser()`)
- Prisma ORM with PostgreSQL (single `baker` schema, multi-schema preview feature enabled)
- DaisyUI v5 component library (theme: `business`)
- Zustand (toast store) + React Context (header, toast providers)
- TanStack React Query for client-side data fetching
- AWS S3 (uploads via presigned URLs), SES (invitation emails)
- Zod v4 for validation
- Deployed on Vercel

## Common Commands
- `npm run dev` — starts local Postgres Docker + Next.js dev server
- `npm run check` — type-check + lint (run before committing)
- `npm run build` — production build
- `npx prisma migrate dev` — run DB migrations
- `npx prisma studio` — visual DB browser
- `npx vercel --prod` — deploy to production (blocks ~2min with no output)

## Architecture

### Route Structure
- `/` — landing page (public)
- `/sign-in`, `/sign-up` — Clerk auth pages (public)
- `/dashboard/*` — main app (requires auth + bakery association)
- `/admin/*` — platform admin panel (requires `isPlatformAdmin`)
- `/api/*` — API routes (bakeries, tags, upload, users, vendors)

### Data Flow Pattern
Server actions (`src/app/actions/*.ts`) are the primary mutation layer. They follow this pattern:
1. `getCurrentUser()` for auth
2. Zod schema validation (schemas in `src/lib/validations/`)
3. Prisma DB operations via `db` (re-exported from `src/lib/prisma.ts`)
4. `revalidatePath()` for cache invalidation
5. Activity logging via `createActivityLog()`

### Auth & Multi-Tenancy
- `src/lib/clerk.ts` → `getCurrentUser()` is the central auth function. It syncs Clerk users to the DB, auto-accepts pending invitations, handles bakery selection via cookie, and returns an enriched user object with `bakeryId`, `bakery`, and `allBakeries`.
- `src/middleware.ts` → Clerk middleware protects all routes except `/`, `/sign-in`, `/sign-up`, and `/api/webhooks`.
- `src/lib/permissions.ts` → Role-based permission system. Platform admins bypass all checks. Bakery-level permissions stored as JSON in the `Role` model.
- Multi-bakery: schema supports many-to-many via `UserBakery`, but UI currently treats users as single-bakery. Platform admins can switch bakeries via cookie.

### Key Conventions
- Prisma client generated to `src/generated/prisma/` (not default location)
- Import types from `@/generated/prisma`, not `@prisma/client`
- Path alias: `@/*` maps to `src/*`
- All Prisma models use `@@map()` for snake_case table names
- Decimal fields use `@db.Decimal(x, y)` — handle with Prisma's `Decimal` type
- Server actions use `'use server'` directive and return `{ success, data?, error? }` pattern

### Component Organization
- `src/components/ui/` — shared UI primitives
- `src/components/layout/` — app shell (AppLayout with sidebar nav)
- `src/components/{domain}/` — feature-specific components (recipes, inventory, etc.)
- Rich text editing via `@mdxeditor/editor` (recipe instructions)
- Drag-and-drop via `@dnd-kit` (recipe sections, production sheet ordering)

### Inventory System
FIFO lot-based tracking. `Inventory` is a config record per ingredient, `InventoryLot` tracks individual purchases with remaining quantities. `InventoryUsage` records consumption tied to production sheets. Weighted average costing flows up to recipe cost calculation.

## Deployment (Vercel)
- Project: `daily-baker` under `pbonnevilles-projects`
- Custom build script: `scripts/vercel-deploy.sh` (handles Prisma migration baselining)
- All env vars managed via `npx vercel env add/rm` — see `.env.example` for full list
- `NEXT_PUBLIC_*` vars must be set in Vercel (needed at build time, not just runtime)

## Local Development
- Local Postgres runs via Docker on port 5434
- `.env` has local-only values — never matches production
- Clerk keys in `.env` are blank — auth features won't work locally without them
- Package manager: pnpm (specified in `packageManager` field), but scripts use `npm run`

## Gotchas
- Vercel CLI deploy shows no progress for ~2min — this is normal
- Keep Next.js, React, and @clerk/nextjs versions in sync — peer dep conflicts are common
- Prisma generates on `postinstall` — no separate step needed after `npm ci`
- `src/generated/` is gitignored — always regenerate after cloning
