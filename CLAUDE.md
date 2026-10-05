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
- `npm run test:api`: all tests. `tests/api/` calls a dev server on port 3031 against the local DB, started with the S3 bucket blanked (`AWS_S3_BUCKET_NAME= npx next dev --port 3031`, or the `api-test` launch config) so recipe snapshots aren't uploaded; global setup creates and deletes throwaway bakeries and refuses non-localhost databases. `tests/actions/` calls the server actions directly with UI-shaped payloads (Clerk, `next/cache`, SES and S3 mocked) and needs no server
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
- `/api/*` — internal API routes (bakeries, tags, upload, users, vendors)
- `/api/v1/*` — public REST API (see REST API section below)

### Data Flow Pattern
Every mutation lives in a shared service (`src/lib/services/*.ts`) that both the dashboard and the REST API call, so the two can't diverge. Anything the dashboard can do must also be possible through `/api/v1`.

- **Services** take a `ServiceContext` (`{ bakeryId, userId, isPlatformAdmin }`) plus raw input. They parse with the Zod schema (forcing `bakeryId` from the context), load existing rows with `findFirst({ where: { id, bakeryId } })`, reject other tenants' foreign keys with `assertAllOwned()`, apply the delete guards, and log with `logActivity()`. They throw `ServiceError` (404 missing, 409 guard, 422 invalid, 403 permission) and must not import Next or Clerk.
- **Server actions** (`src/app/actions/*.ts`) are thin wrappers: `actionContext()` → service → `revalidatePath()` → `{ success, data?, error? }` via `actionError()`.
- **API routes** pass the service to `createCrudRoutes({ service })`, or use `serviceHandler()` for action endpoints (e.g. `POST /products/:id/recalculate`).
- Activity logs need a user, so API-key writes aren't logged yet (keys have no user).

### Auth & Multi-Tenancy
- `src/lib/clerk.ts` → `getCurrentUser()` is the central auth function. It syncs Clerk users to the DB, auto-accepts pending invitations, handles bakery selection via cookie, and returns an enriched user object with `bakeryId`, `bakery`, and `allBakeries`.
- `src/proxy.ts` → Clerk middleware protects all routes except `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, and `/api/v1/*` (REST API handles its own auth).
- `src/lib/permissions.ts` → Role-based permission system. Platform admins bypass all checks. Bakery-level permissions stored as JSON in the `Role` model.
- Multi-bakery: schema supports many-to-many via `UserBakery`, but UI currently treats users as single-bakery. Platform admins can switch bakeries via cookie.

### Key Conventions
- Prisma client generated to `src/generated/prisma/` (not default location)
- Import types from `@/generated/prisma`, not `@prisma/client`
- Path alias: `@/*` maps to `src/*`
- All Prisma models use `@@map()` for snake_case table names
- Decimal fields use `@db.Decimal(x, y)` — handle with Prisma's `Decimal` type
- Server actions use `'use server'` directive and return `{ success, data?, error? }` pattern

### Form Conventions
All forms follow a consistent pattern. Reference `EquipmentForm.tsx` or `TagForm.tsx` as canonical examples.

**Structure:**
- Form wrapper: `<form className="space-y-8">`
- Sections: `<div className="space-y-0">` with `<h2 className="text-xl font-semibold">` header
- Fields: `<fieldset className="fieldset">` + `<legend className="fieldset-legend">Name *</legend>` (not `form-control`/`label`/`label-text`)
- All inputs/selects get `w-full` class
- Side-by-side fields: `grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6`
- Helper text: `<label className="label"><span className="label-text-alt">...</span></label>` below inputs

**State & submission:**
- Use `useFormSubmit` hook from `@/hooks/useFormSubmit` — not manual `isSubmitting`/`error` state
- Errors display via toast only (from `useFormSubmit`) — no inline error alerts in the form body

**Action buttons:**
- Action buttons go in the sticky navbar, not at the bottom of the form
- Each form has a `*NewPageContent` or `*EditPageContent` client wrapper that:
  - Manages `formRef` and `isSaving` state
  - Passes `onFormRefChange`, `onSavingChange`, `showBottomActions={false}` to the form
  - Renders `<SetPageHeader sticky actions={...} />` with save/create button that calls `formRef.requestSubmit()`
- Forms keep `showBottomActions` prop (default `true`) as fallback but page content wrappers set it to `false`

### Component Organization
- `src/components/ui/` — shared UI primitives
- `src/components/layout/` — app shell (AppLayout with sidebar nav)
- `src/components/{domain}/` — feature-specific components (recipes, inventory, etc.)
- Rich text editing via `@mdxeditor/editor` (recipe instructions)
- Drag-and-drop via `@dnd-kit` (recipe sections, production sheet ordering)

### Inventory System
FIFO lot-based tracking. `Inventory` is a config record per ingredient, `InventoryLot` tracks individual purchases with remaining quantities. `InventoryUsage` records consumption tied to production sheets. Weighted average costing flows up to recipe cost calculation.

### REST API (`/api/v1/`)
Public REST API for programmatic access to bakery data. All bakery-scoped endpoints automatically filter by the authenticated user's bakery.

**Authentication** — dual-mode via `resolveApiAuth()` in `src/lib/api/auth.ts`:
- **API keys**: `Authorization: Bearer dbk_...` — keys are bcrypt-hashed in the `ApiKey` model, matched by prefix lookup. Scopes: `read`, `write`.
- **Clerk JWT**: `Authorization: Bearer <clerk-session-token>` — validated via Clerk's `verifyToken()`.

**Route factory** — `createCrudRoutes()` in `src/lib/api/create-crud-routes.ts` generates GET (list + single), POST, PUT, DELETE handlers for a Prisma model. Config options: `bakeryScoped`, `searchFields`, `allowedIncludes`, `validators`, `readOnly`, `adminOnly`, `service` (`{ create, update, remove }` shared service functions that replace the generic Prisma write). Bakery-scoped routes return 403 when the caller has no bakery. Each resource's config lives in `src/lib/api/resources/` and both route files import it.

**Route files** — `src/app/api/v1/{resource}/route.ts` (collection) and `src/app/api/v1/{resource}/[id]/route.ts` (single record), plus action subroutes. Resources: activity-logs, bakeries, equipment, ingredients (+ `/:id/vendors`), inventory (settings only), inventory-lots, invitations (+ `/:id/revoke`, `/:id/resend`), production-sheets (+ `/:id/recipes`), products (+ `/:id/recalculate`), recipes, roles, supplies, tag-types, tags (+ `/:id/assignments`, `/entity-tags/:type/:id`), unit-conversions, users (+ `/:id/bakeries/:bakeryId`), vendors. Nested children (recipe sections, product variations, sheet recipes) are written through their parent.

**Response shape**: `{ success: boolean, data?: T, meta?: { page, limit, total, totalPages }, error?: string }`

**Pagination**: `?page=&limit=&search=&sort=&order=&include=` — parsed by `src/lib/api/pagination.ts`.

**API documentation**:
- OpenAPI 3.1 spec: `GET /api/v1/openapi.json` — auto-generated from route registry (`src/lib/api/route-registry.ts`) + Zod schemas via `toJSONSchema()`. Registry entries read schemas/includes/search from each resource's route config; add action endpoints to the entry's `actions`. `tests/api/openapi.test.ts` fails if the spec and the route files disagree.
- Swagger UI: `/api/v1/docs` — interactive API explorer using `swagger-ui-react`.

**API key management UI**: `/dashboard/settings/api-keys/` — create keys (with name, scopes, optional expiration), copy on reveal, revoke. Component: `src/components/settings/ApiKeyManager.tsx`, server actions: `src/app/actions/apiKey.ts`.

**Fetching the bakery ingredient list**: the REST API is the fast source — `curl -H 'Authorization: Bearer dbk_...' 'https://baker.dailygrains.co/api/v1/ingredients?limit=100&page=1'` returns ingredients with name/unit. The default page limit is 25 and the max is 100 (`MAX_LIMIT` in `src/lib/api/pagination.ts`; larger values are silently clamped), so check `meta.totalPages` and fetch every page. There are 100+ ingredients, and the flours and grain berries land on page 2. This is faster than parsing `square_ingredients.csv`.

## Deployment (Vercel)
- Project: `daily-baker` under `pbonnevilles-projects`
- Custom build script: `scripts/vercel-deploy.sh` (handles Prisma migration baselining)
- All env vars managed via `npx vercel env add/rm` — see `.env.example` for full list
- `NEXT_PUBLIC_*` vars must be set in Vercel (needed at build time, not just runtime)

## Local Development
- Local Postgres runs via Docker on port 5434
- `.env` has local-only values — never matches production
- Clerk keys in `.env` are blank — auth features won't work locally without them
- Local `.env` points `AWS_S3_BUCKET_NAME` at the production uploads bucket, so local saves upload real snapshots and files there
- Package manager: pnpm (specified in `packageManager` field), but scripts use `npm run`

## Gotchas
- Clerk middleware processes ALL matched requests, including "public" routes — it parses Bearer tokens as JWTs and sets `x-clerk-auth-status: signed-out` for non-JWT tokens (like `dbk_*` API keys), but does NOT strip the Authorization header. Route handlers still receive the original header.
- `prisma db execute` is for DDL only — it does NOT return SELECT query results (always prints "Script executed successfully")
- Vercel CLI deploy shows no progress for ~2min — this is normal
- Keep Next.js, React, and @clerk/nextjs versions in sync — peer dep conflicts are common
- Prisma generates on `postinstall` — no separate step needed after `npm ci`
- `src/generated/` is gitignored — always regenerate after cloning
