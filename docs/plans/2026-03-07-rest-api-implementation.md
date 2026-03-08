# REST API v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full REST API at `/api/v1/` for all Prisma models with dual auth (API keys + Clerk JWT), a convention-based route factory, OpenAPI docs, and an API key management UI.

**Architecture:** A `createCrudRoutes()` factory generates standardized CRUD handlers from per-model config objects (~15 lines each). Dual auth middleware resolves either API key or Clerk JWT to an auth context. OpenAPI spec is auto-generated from factory configs + Zod schemas. API key management lives at `/dashboard/settings/api-keys`.

**Tech Stack:** Next.js 16 App Router, Prisma, Zod v4, bcryptjs (new dep), swagger-ui-react (new dep), zod-to-json-schema (new dep)

**Design doc:** `docs/plans/2026-03-07-rest-api-design.md`

---

## Task 1: Add ApiKey Prisma Model + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- New migration via `npx prisma migrate dev`

**Step 1: Add ApiKey model to schema**

Add to `prisma/schema.prisma` after the `Role` model:

```prisma
model ApiKey {
  id         String    @id @default(cuid())
  bakeryId   String
  bakery     Bakery    @relation(fields: [bakeryId], references: [id], onDelete: Cascade)
  name       String
  keyHash    String    @unique
  prefix     String
  scopes     Json      @default("[]")
  lastUsedAt DateTime?
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())
  revokedAt  DateTime?

  @@index([bakeryId])
  @@index([prefix])
  @@map("api_keys")
  @@schema("baker")
}
```

Also add to the `Bakery` model's relations:

```prisma
apiKeys      ApiKey[]
```

**Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_api_keys`

Expected: Migration created, Prisma client regenerated.

**Step 3: Verify generation**

Run: `npx prisma generate`

Expected: Client generated to `src/generated/prisma/` with `ApiKey` model.

**Step 4: Commit**

```bash
git add prisma/ src/generated/
git commit -m "feat: add ApiKey model for REST API authentication"
```

---

## Task 2: API Auth Middleware

**Files:**
- Create: `src/lib/api/auth.ts`

**Step 1: Install bcryptjs**

Run: `npm install bcryptjs && npm install -D @types/bcryptjs`

**Step 2: Create auth module**

Create `src/lib/api/auth.ts`:

```typescript
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';

export interface ApiAuthContext {
  bakeryId: string;
  userId: string | null;
  isApiKey: boolean;
  scopes: string[];
  isPlatformAdmin: boolean;
}

/**
 * Resolve auth from either API key (dbk_*) or Clerk JWT.
 * Returns null if unauthenticated.
 */
export async function resolveApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    // Fall back to Clerk cookie-based auth (browser requests)
    return resolveClerkAuth();
  }

  const token = authHeader.slice(7);

  if (token.startsWith('dbk_')) {
    return resolveApiKeyAuth(token);
  }

  // Assume Clerk JWT for non-dbk_ bearer tokens
  return resolveClerkAuth();
}

async function resolveApiKeyAuth(token: string): Promise<ApiAuthContext | null> {
  // Find by prefix (first 12 chars: "dbk_" + 8 char id)
  const prefix = token.slice(0, 12);

  const apiKey = await db.apiKey.findFirst({
    where: {
      prefix,
      revokedAt: null,
    },
  });

  if (!apiKey) return null;

  // Verify full key hash
  const valid = await bcrypt.compare(token, apiKey.keyHash);
  if (!valid) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used (fire and forget)
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  const scopes = (apiKey.scopes as string[]) || [];

  return {
    bakeryId: apiKey.bakeryId,
    userId: null,
    isApiKey: true,
    scopes,
    isPlatformAdmin: false,
  };
}

async function resolveClerkAuth(): Promise<ApiAuthContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    bakeryId: user.bakeryId ?? '',
    userId: user.id,
    isApiKey: false,
    scopes: ['read', 'write'],
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

/**
 * Check if auth context has required scope.
 */
export function hasScope(auth: ApiAuthContext, scope: 'read' | 'write'): boolean {
  if (auth.isPlatformAdmin) return true;
  return auth.scopes.includes(scope);
}
```

**Step 3: Commit**

```bash
git add src/lib/api/auth.ts package.json package-lock.json
git commit -m "feat: add dual API auth middleware (API key + Clerk JWT)"
```

---

## Task 3: API Response Helpers & Pagination

**Files:**
- Create: `src/lib/api/responses.ts`
- Create: `src/lib/api/pagination.ts`

**Step 1: Create response helpers**

Create `src/lib/api/responses.ts`:

```typescript
import { NextResponse } from 'next/server';

export function apiSuccess(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) });
}

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details && { details }) },
    { status }
  );
}

export function api401() {
  return apiError('Unauthorized', 401);
}

export function api403(message = 'Forbidden') {
  return apiError(message, 403);
}

export function api404(entity = 'Resource') {
  return apiError(`${entity} not found`, 404);
}

export function api422(details: unknown) {
  return apiError('Validation failed', 422, details);
}
```

**Step 2: Create pagination helpers**

Create `src/lib/api/pagination.ts`:

```typescript
import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  search: string | null;
  sort: string;
  order: 'asc' | 'desc';
  include: string[];
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export function parsePagination(req: NextRequest): PaginationParams {
  const params = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get('limit') || String(DEFAULT_LIMIT))));
  const search = params.get('search') || null;
  const sort = params.get('sort') || 'createdAt';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const include = params.get('include')?.split(',').filter(Boolean) || [];

  return { page, limit, skip: (page - 1) * limit, search, sort, order, include };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Step 3: Commit**

```bash
git add src/lib/api/responses.ts src/lib/api/pagination.ts
git commit -m "feat: add API response helpers and pagination utilities"
```

---

## Task 4: Route Factory — `createCrudRoutes()`

**Files:**
- Create: `src/lib/api/create-crud-routes.ts`

This is the core factory. It returns handlers for both collection (`GET` list, `POST` create) and single-record (`GET` one, `PUT` update, `DELETE`) routes.

**Step 1: Create the factory**

Create `src/lib/api/create-crud-routes.ts`:

```typescript
import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { db } from '@/lib/db';
import { resolveApiAuth, hasScope, type ApiAuthContext } from './auth';
import { parsePagination, paginationMeta } from './pagination';
import { apiSuccess, apiError, api401, api403, api404, api422 } from './responses';

type PrismaModel = keyof typeof db & string;

export interface CrudRouteConfig {
  model: PrismaModel;
  bakeryScoped: boolean;
  searchFields?: string[];
  defaultInclude?: Record<string, unknown>;
  allowedIncludes?: string[];
  validators?: {
    create?: ZodSchema;
    update?: ZodSchema;
  };
  readOnly?: boolean;
  adminOnly?: boolean;
  beforeCreate?: (data: Record<string, unknown>, auth: ApiAuthContext) => Record<string, unknown> | Promise<Record<string, unknown>>;
  afterCreate?: (record: unknown, auth: ApiAuthContext) => void | Promise<void>;
  beforeDelete?: (id: string, auth: ApiAuthContext) => void | Promise<void>;
}

/**
 * Build an include object from ?include= query param,
 * filtered against allowedIncludes.
 */
function buildInclude(
  requested: string[],
  allowed: string[] | undefined,
  defaults: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = { ...defaults };

  if (!allowed || requested.length === 0) return Object.keys(result).length ? result : undefined;

  for (const inc of requested) {
    if (allowed.includes(inc)) {
      // Handle dot-notation: "sections.ingredients" → { sections: { include: { ingredients: true } } }
      const parts = inc.split('.');
      let current = result;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = true;
        } else {
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = { include: {} };
          }
          current = (current[part] as Record<string, unknown>).include as Record<string, unknown>;
        }
      }
    }
  }

  return Object.keys(result).length ? result : undefined;
}

function buildSearchWhere(search: string | null, fields: string[] | undefined) {
  if (!search || !fields?.length) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
  };
}

export function createCrudRoutes(config: CrudRouteConfig) {
  const prismaModel = (db as Record<string, any>)[config.model];

  // --- Collection handlers (GET list, POST create) ---

  async function listHandler(req: NextRequest) {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');

    const pagination = parsePagination(req);
    const where = {
      ...(config.bakeryScoped && auth.bakeryId ? { bakeryId: auth.bakeryId } : {}),
      ...buildSearchWhere(pagination.search, config.searchFields),
    };

    const include = buildInclude(pagination.include, config.allowedIncludes, config.defaultInclude);

    const [data, total] = await Promise.all([
      prismaModel.findMany({
        where,
        ...(include && { include }),
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [pagination.sort]: pagination.order },
      }),
      prismaModel.count({ where }),
    ]);

    return apiSuccess(data, paginationMeta(pagination.page, pagination.limit, total));
  }

  async function createHandler(req: NextRequest) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    // Inject bakeryId for bakery-scoped models
    if (config.bakeryScoped && auth.bakeryId) {
      body.bakeryId = auth.bakeryId;
    }

    // Validate
    if (config.validators?.create) {
      try {
        body = config.validators.create.parse(body) as Record<string, unknown>;
      } catch (err) {
        if (err instanceof ZodError) {
          return api422(err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
        }
        throw err;
      }
    }

    if (config.beforeCreate) {
      body = await config.beforeCreate(body, auth);
    }

    const record = await prismaModel.create({ data: body });

    if (config.afterCreate) {
      await config.afterCreate(record, auth);
    }

    return apiSuccess(record);
  }

  // --- Single-record handlers (GET one, PUT update, DELETE) ---

  async function getOneHandler(req: NextRequest, id: string) {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');

    const pagination = parsePagination(req);
    const include = buildInclude(pagination.include, config.allowedIncludes, config.defaultInclude);

    const where: Record<string, unknown> = { id };
    if (config.bakeryScoped && auth.bakeryId) {
      where.bakeryId = auth.bakeryId;
    }

    const record = await prismaModel.findFirst({ where, ...(include && { include }) });
    if (!record) return api404();

    return apiSuccess(record);
  }

  async function updateHandler(req: NextRequest, id: string) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    // Verify record exists and belongs to bakery
    const existing = await prismaModel.findFirst({
      where: {
        id,
        ...(config.bakeryScoped && auth.bakeryId ? { bakeryId: auth.bakeryId } : {}),
      },
    });
    if (!existing) return api404();

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    body.id = id;

    if (config.validators?.update) {
      try {
        body = config.validators.update.parse(body) as Record<string, unknown>;
      } catch (err) {
        if (err instanceof ZodError) {
          return api422(err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
        }
        throw err;
      }
    }

    // Remove id from update data
    const { id: _id, ...updateData } = body;
    const record = await prismaModel.update({ where: { id }, data: updateData });

    return apiSuccess(record);
  }

  async function deleteHandler(req: NextRequest, id: string) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    const existing = await prismaModel.findFirst({
      where: {
        id,
        ...(config.bakeryScoped && auth.bakeryId ? { bakeryId: auth.bakeryId } : {}),
      },
    });
    if (!existing) return api404();

    if (config.beforeDelete) {
      await config.beforeDelete(id, auth);
    }

    await prismaModel.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  }

  // --- Return handlers for collection and single-record routes ---

  return {
    // For /api/v1/{model}/route.ts
    collection: {
      GET: async (req: NextRequest) => {
        try {
          return await listHandler(req);
        } catch (error) {
          console.error(`API GET /${config.model} error:`, error);
          return apiError('Internal server error', 500);
        }
      },
      POST: async (req: NextRequest) => {
        try {
          return await createHandler(req);
        } catch (error) {
          console.error(`API POST /${config.model} error:`, error);
          return apiError('Internal server error', 500);
        }
      },
    },
    // For /api/v1/{model}/[id]/route.ts
    single: {
      GET: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await getOneHandler(req, id);
        } catch (error) {
          console.error(`API GET /${config.model}/:id error:`, error);
          return apiError('Internal server error', 500);
        }
      },
      PUT: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await updateHandler(req, id);
        } catch (error) {
          console.error(`API PUT /${config.model}/:id error:`, error);
          return apiError('Internal server error', 500);
        }
      },
      DELETE: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await deleteHandler(req, id);
        } catch (error) {
          console.error(`API DELETE /${config.model}/:id error:`, error);
          return apiError('Internal server error', 500);
        }
      },
    },
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/api/create-crud-routes.ts
git commit -m "feat: add CRUD route factory for API v1"
```

---

## Task 5: Wire Up All Model Routes

**Files (2 per model — create all):**
- `src/app/api/v1/equipment/route.ts`
- `src/app/api/v1/equipment/[id]/route.ts`
- `src/app/api/v1/ingredients/route.ts`
- `src/app/api/v1/ingredients/[id]/route.ts`
- `src/app/api/v1/inventory/route.ts`
- `src/app/api/v1/inventory/[id]/route.ts`
- `src/app/api/v1/recipes/route.ts`
- `src/app/api/v1/recipes/[id]/route.ts`
- `src/app/api/v1/vendors/route.ts`
- `src/app/api/v1/vendors/[id]/route.ts`
- `src/app/api/v1/production-sheets/route.ts`
- `src/app/api/v1/production-sheets/[id]/route.ts`
- `src/app/api/v1/tags/route.ts`
- `src/app/api/v1/tags/[id]/route.ts`
- `src/app/api/v1/tag-types/route.ts`
- `src/app/api/v1/tag-types/[id]/route.ts`
- `src/app/api/v1/roles/route.ts`
- `src/app/api/v1/roles/[id]/route.ts`
- `src/app/api/v1/invitations/route.ts`
- `src/app/api/v1/invitations/[id]/route.ts`
- `src/app/api/v1/activity-logs/route.ts`
- `src/app/api/v1/activity-logs/[id]/route.ts`
- `src/app/api/v1/users/route.ts`
- `src/app/api/v1/users/[id]/route.ts`
- `src/app/api/v1/bakeries/route.ts`
- `src/app/api/v1/bakeries/[id]/route.ts`

Each follows this pattern (equipment example):

```typescript
// src/app/api/v1/equipment/route.ts
import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createEquipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment';

const routes = createCrudRoutes({
  model: 'equipment',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['vendor'],
  validators: { create: createEquipmentSchema, update: updateEquipmentSchema },
});

export const { GET, POST } = routes.collection;
```

```typescript
// src/app/api/v1/equipment/[id]/route.ts
import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createEquipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment';

const routes = createCrudRoutes({
  model: 'equipment',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['vendor'],
  validators: { create: createEquipmentSchema, update: updateEquipmentSchema },
});

export const { GET, PUT, DELETE } = routes.single;
```

**Notable variations:**

- `activity-logs`: `readOnly: true`
- `users`: `adminOnly: true`
- `bakeries` (v1): `adminOnly: true`, `bakeryScoped: false`
- `recipes`: `allowedIncludes: ['sections', 'sections.ingredients', 'productionSheetRecipes']`
- `inventory`: `allowedIncludes: ['lots', 'ingredient']`
- `vendors`: `allowedIncludes: ['contacts', 'ingredients']`
- `production-sheets` model name: `productionSheet`
- `tag-types` model name: `tagType`

**Step 1:** Create all route files following the pattern above, using existing Zod validators where available. For models without validators (roles, invitations, activity-logs, tag-types), omit the `validators` field.

**Step 2: Commit**

```bash
git add src/app/api/v1/
git commit -m "feat: add API v1 routes for all models"
```

---

## Task 6: API Key CRUD Server Actions

**Files:**
- Create: `src/lib/validations/apiKey.ts`
- Create: `src/app/actions/apiKey.ts`

**Step 1: Create Zod validation**

```typescript
// src/lib/validations/apiKey.ts
import { z } from 'zod';

export const createApiKeySchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z.array(z.enum(['read', 'write'])).min(1, 'At least one scope required'),
  expiresAt: z.date().optional().nullable(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
```

**Step 2: Create server actions**

Create `src/app/actions/apiKey.ts` with:
- `createApiKey(input)` — generates `dbk_` + 32 random chars, hashes with bcrypt, stores hash + prefix, returns the raw key once
- `listApiKeys(bakeryId)` — returns keys (without hash) for the bakery
- `revokeApiKey(id)` — sets `revokedAt` timestamp

**Step 3: Commit**

```bash
git add src/lib/validations/apiKey.ts src/app/actions/apiKey.ts
git commit -m "feat: add API key CRUD server actions"
```

---

## Task 7: API Key Management UI

**Files:**
- Create: `src/app/dashboard/settings/api-keys/page.tsx`
- Create: `src/components/settings/ApiKeyList.tsx`
- Create: `src/components/settings/CreateApiKeyModal.tsx`

**Step 1:** Build the page at `/dashboard/settings/api-keys` following existing form conventions (DaisyUI, fieldset/legend pattern, `useFormSubmit` hook).

Features:
- Table listing keys: name, prefix (`dbk_xxxxxxxx...`), scopes, last used, created, revoke button
- "Create API Key" button → modal with name input + scope checkboxes
- After creation: dialog showing the full key with a copy button + warning it won't be shown again
- Revoke button with confirmation

**Step 2:** Add link to API keys page from the settings page or sidebar nav.

**Step 3: Commit**

```bash
git add src/app/dashboard/settings/api-keys/ src/components/settings/
git commit -m "feat: add API key management UI"
```

---

## Task 8: OpenAPI Spec Generation

**Files:**
- Create: `src/lib/api/openapi.ts`
- Create: `src/app/api/v1/openapi.json/route.ts`

**Step 1: Install dependency**

Run: `npm install zod-to-json-schema`

**Step 2: Create spec generator**

Create `src/lib/api/openapi.ts` that:
- Reads all route configs (import from a registry/index file or build from conventions)
- Converts Zod schemas to JSON Schema for request/response bodies
- Generates OpenAPI 3.1 paths, components, and security schemes
- Returns a complete OpenAPI JSON object

**Step 3: Create spec endpoint**

```typescript
// src/app/api/v1/openapi.json/route.ts
import { NextResponse } from 'next/server';
import { generateOpenApiSpec } from '@/lib/api/openapi';

export async function GET() {
  const spec = generateOpenApiSpec();
  return NextResponse.json(spec);
}
```

**Step 4: Commit**

```bash
git add src/lib/api/openapi.ts src/app/api/v1/openapi.json/
git commit -m "feat: add auto-generated OpenAPI spec endpoint"
```

---

## Task 9: Swagger UI Docs Page

**Files:**
- Create: `src/app/api/v1/docs/page.tsx` (or a simple HTML route)

**Step 1: Install swagger-ui**

Run: `npm install swagger-ui-react && npm install -D @types/swagger-ui-react`

**Step 2: Create docs page**

A simple page that renders Swagger UI pointed at `/api/v1/openapi.json`. This can be a lightweight client component or a static HTML page served from the API route.

**Step 3: Commit**

```bash
git add src/app/api/v1/docs/
git commit -m "feat: add Swagger UI docs page at /api/v1/docs"
```

---

## Task 10: Type Check, Lint, and Verify

**Step 1:** Run `npm run check` — fix any type or lint errors.

**Step 2:** Run `npm run build` — verify production build succeeds.

**Step 3:** Manual smoke test — start dev server, create an API key via UI, use it with `curl`:

```bash
curl -H "Authorization: Bearer dbk_..." https://localhost:3000/api/v1/recipes
```

**Step 4: Commit any fixes**

```bash
git commit -m "fix: resolve type/lint issues from API v1 implementation"
```

---

## Task 11: Update Middleware for API Routes

**Files:**
- Modify: `src/middleware.ts` (or `src/proxy.ts`)

Ensure Clerk middleware allows `/api/v1/*` routes through (they handle their own auth via `resolveApiAuth`). Add `/api/v1/(.*)` to the public routes matcher if needed.

**Step 1:** Check current middleware config and add API v1 routes to the public/ignored matcher.

**Step 2: Commit**

```bash
git commit -m "fix: allow API v1 routes through Clerk middleware"
```

---

## Summary

| Task | Description | Est. |
|---|---|---|
| 1 | ApiKey Prisma model + migration | 5 min |
| 2 | API auth middleware (dual auth) | 10 min |
| 3 | Response helpers + pagination | 5 min |
| 4 | Route factory (`createCrudRoutes`) | 15 min |
| 5 | Wire up all 13 model routes (26 files) | 15 min |
| 6 | API key CRUD server actions | 10 min |
| 7 | API key management UI | 15 min |
| 8 | OpenAPI spec generation | 15 min |
| 9 | Swagger UI docs page | 5 min |
| 10 | Type check + lint + smoke test | 10 min |
| 11 | Middleware update for API routes | 5 min |
