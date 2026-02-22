# Daily Baker

## Overview
Bakery management app — recipes, ingredients, inventory, production sheets.
Production URL: https://baker.dailygrains.co

## Tech Stack
- Next.js 16 (App Router, Turbopack) + TypeScript
- Clerk authentication
- Prisma ORM with PostgreSQL
- AWS S3 (uploads), SES (email)
- Sentry error tracking (optional)
- Deployed on Vercel

## Common Commands
- `npm run dev` — starts local Postgres Docker + Next.js dev server
- `npm run check` — type-check + lint (run before committing)
- `npm run build` — production build
- `npx prisma migrate dev` — run DB migrations
- `npx prisma studio` — visual DB browser
- `npx vercel env ls` — list Vercel env vars
- `npx vercel --prod` — deploy to production (blocks ~2min with no output)

## Deployment (Vercel)
- Project: `daily-baker` under `pbonnevilles-projects`
- Custom build script: `scripts/vercel-deploy.sh` (handles Prisma migration baselining)
- All env vars managed via `npx vercel env add/rm` — see `.env.example` for full list
- `NEXT_PUBLIC_*` vars must be set in Vercel (needed at build time, not just runtime)

## Local Development
- Local Postgres runs via Docker on port 5434
- `.env` has local-only values — never matches production
- Clerk keys in `.env` are blank — auth features won't work locally without them

## Gotchas
- Vercel CLI deploy (`npx vercel --prod`) shows no progress for ~2min — this is normal
- Keep Next.js, React, and @clerk/nextjs versions in sync — peer dep conflicts are common
- Prisma generates on `postinstall` — no separate step needed after `npm ci`
