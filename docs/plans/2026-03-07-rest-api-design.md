# REST API Design — Daily Baker

**Date:** 2026-03-07
**Status:** Approved

## Goal

Add a comprehensive REST API (`/api/v1/`) covering all models with dual authentication (API keys + Clerk JWT), auto-generated OpenAPI docs, and a convention-based route factory so new models get API endpoints with minimal config.

## Consumers

- Claude Code CLI (via `curl` with API key)
- Chrome browser (via Clerk JWT, same as current UI auth)
- External integrations (via API key)

## URL Scheme

All endpoints under `/api/v1/`:

```
GET    /api/v1/{model}         → list (paginated, filterable)
POST   /api/v1/{model}         → create
GET    /api/v1/{model}/:id     → get one
PUT    /api/v1/{model}/:id     → update
DELETE /api/v1/{model}/:id     → delete
```

### Models

| URL segment | Prisma model | Bakery-scoped |
|---|---|---|
| `recipes` | Recipe | yes |
| `ingredients` | Ingredient | yes |
| `inventory` | Inventory | yes |
| `vendors` | Vendor | yes |
| `equipment` | Equipment | yes |
| `production-sheets` | ProductionSheet | yes |
| `tags` | Tag | yes |
| `tag-types` | TagType | yes |
| `roles` | Role | no |
| `invitations` | Invitation | yes |
| `activity-logs` | ActivityLog | yes (read-only) |
| `users` | User | no (admin only) |
| `bakeries` | Bakery | no (admin only) |

### Nested Sub-Resources

```
GET /api/v1/recipes/:id/sections            → RecipeSection[]
GET /api/v1/inventory/:id/lots              → InventoryLot[]
GET /api/v1/vendors/:id/contacts            → VendorContact[]
```

### Standard Query Parameters

All list endpoints support:

- `?page=1&limit=25` — pagination (default limit 25, max 100)
- `?search=sourdough` — text search across configured fields
- `?sort=name&order=asc` — sorting
- `?include=sections,tags` — opt-in relation expansion

### Standard Response Shape

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 25, "total": 142 }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "name", "message": "Required" }]
}
```

## Authentication

Dual auth via `Authorization` header:

| Token format | Auth method | Use case |
|---|---|---|
| `dbk_*` | API key lookup (bcrypt hash) | Claude CLI, external integrations |
| `eyJ*` (JWT) | Clerk token validation | Browser, user-context calls |

### ApiKey Prisma Model (new)

```prisma
model ApiKey {
  id         String    @id @default(cuid())
  bakeryId   String
  bakery     Bakery    @relation(fields: [bakeryId], references: [id], onDelete: Cascade)
  name       String                        // "Claude CLI", "POS Integration"
  keyHash    String    @unique             // bcrypt hash
  prefix     String                        // "dbk_" + first 8 chars
  scopes     Json      @default("[]")      // ["read", "write"] or ["read"]
  lastUsedAt DateTime?
  expiresAt  DateTime?                     // null = never expires
  createdAt  DateTime  @default(now())
  revokedAt  DateTime?                     // soft revoke

  @@index([bakeryId])
  @@index([prefix])
  @@map("api_keys")
  @@schema("baker")
}
```

### Auth Middleware Flow

1. Extract `Authorization: Bearer <token>` header
2. If token starts with `dbk_` → hash and look up in `ApiKey` table, resolve bakery, check scopes
3. If token is JWT → validate via Clerk, resolve user + bakery (existing `getCurrentUser()` flow)
4. If neither → return 401
5. Attach auth context (`{ bakeryId, userId?, isApiKey, scopes }`) to request

## Route Factory

### Core: `createCrudRoutes()`

```typescript
// src/lib/api/create-crud-routes.ts
export function createCrudRoutes(config: {
  model: string;                      // Prisma model name
  bakeryScoped: boolean;              // filter by bakeryId
  searchFields?: string[];            // fields for ?search=
  defaultInclude?: object;            // always-included relations
  allowedIncludes?: string[];         // opt-in via ?include=
  validators?: {
    create?: ZodSchema;
    update?: ZodSchema;
  };
  readOnly?: boolean;                 // disable POST/PUT/DELETE
  adminOnly?: boolean;                // require platform admin
  beforeCreate?: (data, ctx) => data;
  afterCreate?: (record, ctx) => void;
  beforeDelete?: (id, ctx) => void;
})
```

Returns `{ GET, POST }` for collection routes and `{ GET, PUT, DELETE }` for `[id]` routes.

### Per-Model Route Files (~15 lines each)

```typescript
// src/app/api/v1/recipes/route.ts
import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createRecipeSchema, updateRecipeSchema } from '@/lib/validations/recipe';

const routes = createCrudRoutes({
  model: 'recipe',
  bakeryScoped: true,
  searchFields: ['name', 'description'],
  allowedIncludes: ['sections', 'sections.ingredients'],
  validators: { create: createRecipeSchema, update: updateRecipeSchema },
});

export const { GET, POST } = routes;
```

```typescript
// src/app/api/v1/recipes/[id]/route.ts
// re-exports from same config
export const { GET, PUT, DELETE } = routes;
```

### File Structure

```
src/lib/api/
  create-crud-routes.ts       ← factory function
  auth.ts                     ← dual auth middleware (API key + Clerk)
  errors.ts                   ← standard error responses
  pagination.ts               ← shared pagination/filtering helpers
  openapi.ts                  ← spec generator

src/app/api/v1/
  docs/route.ts               ← Swagger UI page
  openapi.json/route.ts       ← generated spec endpoint
  recipes/route.ts            ← ~15 lines config
  recipes/[id]/route.ts       ← ~3 lines re-export
  ingredients/route.ts
  ingredients/[id]/route.ts
  ... (same pattern for all models)
```

## OpenAPI & Documentation

### Auto-Generated Spec

- Factory configs + Zod schemas → OpenAPI 3.1 JSON
- Zod-to-JSON-Schema for request/response types
- Prisma schema informs field types and relations
- Generated at build time or on-demand via endpoint

### Endpoints

| URL | Purpose |
|---|---|
| `GET /api/v1/docs` | Swagger UI — interactive API explorer |
| `GET /api/v1/openapi.json` | Raw OpenAPI spec (machine-readable) |

### Client Generation (optional)

```bash
npx openapi-typescript public/api/openapi.json -o src/generated/api-client.ts
```

## API Key Management UI

**Location:** `/dashboard/settings/api-keys`

**Features:**
- List active keys (name, prefix, scopes, last used, created)
- Create key → name + scope (read / read+write) → show key once in copy dialog
- Revoke key (soft delete via `revokedAt`)
- No editing — revoke and recreate instead

## Adding New Models (Going Forward)

1. Create Prisma model + migration
2. Create Zod validation schemas
3. Add 2 route files (~18 lines total) with factory config
4. OpenAPI spec auto-updates
5. Done

## Non-Goals (for now)

- Rate limiting (can add later via middleware)
- Webhooks/event streaming
- GraphQL
- API versioning beyond v1
