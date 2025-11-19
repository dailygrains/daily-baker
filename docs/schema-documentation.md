# Database Schema Documentation

## Overview

Daily Baker uses a multi-tenant database architecture with a two-tier permission system:
- **Platform-level**: Super-admins manage all bakeries
- **Bakery-level**: Dynamic roles with configurable permissions

## Schema Statistics

- **Total Models**: 13
- **Enums**: 2
- **Relationships**: 20+
- **Indexes**: 30+
- **Unique Constraints**: 4

---

## Multi-Tenancy & Platform Administration

### Bakery

**Purpose**: Organization-level multi-tenancy container

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Bakery display name |
| slug | String (unique) | URL-friendly identifier |
| isActive | Boolean | Soft deletion flag (default: true) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Has many: Users, Recipes, Ingredients, Vendors, Equipment, BakeSheets, Roles

**Indexes**:
- `isActive` - For filtering active bakeries

---

### User

**Purpose**: User accounts with platform and bakery-level associations

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| clerkId | String (unique) | Clerk authentication ID |
| email | String | User email |
| name | String? | Display name (optional) |
| **isPlatformAdmin** | Boolean | Super-admin flag (default: false) |
| bakeryId | String? | Associated bakery (nullable) |
| roleId | String? | Bakery-level role (nullable) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| lastLoginAt | DateTime? | Last login tracking |

**Relations**:
- Belongs to: Bakery (optional), Role (optional)
- Has many: InventoryTransactions, CompletedBakeSheets

**Indexes**:
- `isPlatformAdmin` - Quick platform admin lookups
- `bakeryId` - Data scoping queries
- `clerkId` - Authentication lookups

**Key Behaviors**:
- Platform admins (`isPlatformAdmin = true`) can access all data
- Regular users must have `bakeryId` and can only access their bakery's data
- `bakeryId` nullable for platform-only admins
- `roleId` nullable for platform admins who don't need bakery roles

---

### Role

**Purpose**: Dynamic, bakery-scoped permission roles

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| bakeryId | String | Owning bakery |
| name | String | Role name ("Head Baker", etc.) |
| description | String? | Role description |
| permissions | JSON | Permission object |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Bakery
- Has many: Users

**Unique Constraints**:
- `[bakeryId, name]` - Unique role names per bakery

**Indexes**:
- `bakeryId` - Bakery-scoped queries

**Permission Structure** (JSON):
```json
{
  "recipes.read": true,
  "recipes.write": true,
  "recipes.delete": false,
  "inventory.read": true,
  "inventory.write": true,
  "inventory.adjust": false,
  "users.manage": false,
  "roles.manage": false
}
```

---

## Recipe System (Multi-Step)

### Recipe

**Purpose**: Top-level recipe definition

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| bakeryId | String | Owning bakery |
| name | String | Recipe name |
| description | String? | Recipe description (text) |
| yield | String | Expected output ("10 loaves") |
| totalCost | Decimal(10,2) | Computed cost (default: 0) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Bakery
- Has many: RecipeSections, BakeSheets

**Indexes**:
- `bakeryId` - Data scoping
- `name` - Search functionality

**Delete Behavior**:
- Cascade deletes sections and ingredients
- Restricts deletion if bake sheets exist

---

### RecipeSection

**Purpose**: Individual steps in multi-step recipes

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| recipeId | String | Parent recipe |
| name | String | Section name ("Poolish", "Dough") |
| order | Int | Display order (1, 2, 3...) |
| instructions | String (Text) | MDX-formatted instructions |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Recipe
- Has many: RecipeSectionIngredients

**Indexes**:
- `recipeId` - Recipe lookups
- `order` - Ordering sections

**Delete Behavior**:
- Cascade deletes when recipe is deleted
- Cascade deletes associated ingredients

---

### RecipeSectionIngredient

**Purpose**: Junction table linking ingredients to recipe sections

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| sectionId | String | Recipe section |
| ingredientId | String | Ingredient reference |
| quantity | Decimal(10,3) | Amount needed |
| unit | String | Unit of measurement |

**Relations**:
- Belongs to: RecipeSection, Ingredient

**Indexes**:
- `sectionId` - Section queries
- `ingredientId` - Ingredient usage tracking

**Delete Behavior**:
- Cascade when section deleted
- **Restrict** when ingredient deleted (prevents orphaned recipes)

---

## Ingredient & Inventory System

### Ingredient

**Purpose**: Bakery ingredient catalog with inventory tracking

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| bakeryId | String | Owning bakery |
| name | String | Ingredient name |
| currentQty | Decimal(10,3) | Current stock (default: 0) |
| unit | String | Base unit ("g", "ml", "kg") |
| costPerUnit | Decimal(10,2) | Cost for recipe calculations |
| vendorId | String? | Supplier (optional) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Bakery, Vendor (optional)
- Has many: InventoryTransactions, RecipeSectionIngredients

**Indexes**:
- `bakeryId` - Data scoping
- `name` - Search functionality
- `vendorId` - Vendor filtering

---

### InventoryTransaction

**Purpose**: Immutable transaction log for all inventory changes

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| ingredientId | String | Ingredient reference |
| type | TransactionType | RECEIVE, USE, ADJUST, WASTE |
| quantity | Decimal(10,3) | Amount changed |
| unit | String | Unit of measurement |
| notes | String? | Transaction notes (text) |
| bakeSheetId | String? | Source bake sheet (optional) |
| createdBy | String | User who created transaction |
| createdAt | DateTime | Transaction timestamp |

**Relations**:
- Belongs to: Ingredient, User (creator), BakeSheet (optional)

**Indexes**:
- `ingredientId` - Ingredient history
- `type` - Filter by transaction type
- `bakeSheetId` - Bake sheet deductions
- `createdBy` - User activity
- `createdAt` - Chronological queries

**Delete Behavior**:
- Cascade when ingredient deleted
- **Restrict** when user deleted (audit trail preservation)
- SetNull when bake sheet deleted

---

### TransactionType (Enum)

**Values**:
- `RECEIVE` - Inventory received from vendor
- `USE` - Consumed in production (manual or auto from bake sheet)
- `ADJUST` - Manual quantity correction
- `WASTE` - Spoilage or loss

---

## Vendor System

### Vendor

**Purpose**: Supplier contact and relationship management

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| bakeryId | String | Owning bakery |
| name | String | Vendor name |
| phone | String? | Phone number |
| email | String? | Email address |
| website | String? | Website URL |
| notes | String? | Additional notes (text) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Bakery
- Has many: VendorContacts, Ingredients, Equipment

**Indexes**:
- `bakeryId` - Data scoping
- `name` - Search functionality

---

### VendorContact

**Purpose**: Contact persons at vendor companies

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| vendorId | String | Parent vendor |
| name | String | Contact name |
| title | String? | Job title |
| phone | String? | Direct phone |
| email | String? | Direct email |
| notes | String? | Notes (text) |

**Relations**:
- Belongs to: Vendor

**Indexes**:
- `vendorId` - Vendor lookups

**Delete Behavior**:
- Cascade when vendor deleted

---

## Equipment System

### Equipment

**Purpose**: Track equipment purchases, status, and maintenance

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| bakeryId | String | Owning bakery |
| name | String | Equipment name |
| status | EquipmentStatus | Current status |
| vendorId | String? | Supplier (optional) |
| purchaseDate | DateTime? | Date purchased |
| cost | Decimal(10,2)? | Purchase cost |
| quantity | Int | Number owned (default: 1) |
| serialNumber | String? | Serial/model number |
| notes | String? | Notes (text) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Bakery, Vendor (optional)

**Indexes**:
- `bakeryId` - Data scoping
- `status` - Status filtering
- `vendorId` - Vendor queries

---

### EquipmentStatus (Enum)

**Workflow States**:
1. `CONSIDERING` - Research/wishlist phase
2. `ORDERED` - Purchase order placed
3. `RECEIVED` - Delivered, not yet in use
4. `IN_USE` - Active production use
5. `MAINTENANCE` - Under repair
6. `RETIRED` - No longer in service

---

## Bake Sheet System

### BakeSheet

**Purpose**: Production planning and execution tracking

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| bakeryId | String | Owning bakery |
| recipeId | String | Recipe to execute |
| scale | Decimal(5,2) | Recipe multiplier (1.0 = as-is) |
| quantity | String | Expected output ("25 loaves") |
| completed | Boolean | Completion status (default: false) |
| completedAt | DateTime? | Completion timestamp |
| completedBy | String? | User who completed |
| notes | String? | Production notes (text) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations**:
- Belongs to: Bakery, Recipe, User (completer, optional)
- Has many: InventoryTransactions

**Indexes**:
- `bakeryId` - Data scoping
- `recipeId` - Recipe filtering
- `completed` - Status filtering
- `createdAt` - Chronological queries

**Delete Behavior**:
- Cascade when bakery deleted
- **Restrict** when recipe deleted (prevents data loss)
- SetNull when user deleted

**Key Workflow**:
1. Create bake sheet with recipe and scale
2. Mark completed → triggers automatic inventory deduction
3. System creates USE transactions for all ingredients
4. Quantities calculated: `recipe_qty × scale`

---

## Unit Conversion System

### UnitConversion

**Purpose**: Define conversion factors between units

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| fromUnit | String | Source unit ("lbs") |
| toUnit | String | Target unit ("g") |
| factor | Decimal(15,6) | Conversion multiplier (453.592) |
| category | String | "weight" or "volume" |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Unique Constraints**:
- `[fromUnit, toUnit]` - One conversion per unit pair

**Indexes**:
- `category` - Filter by conversion type

**Usage**:
- All inventory stored in metric (g, ml, kg, L)
- Recipes can use imperial units
- Auto-conversion during bake sheet completion
- Admins can edit conversion factors if needed

**Common Conversions** (to be seeded):

**Weight**:
- 1 lb = 453.592 g
- 1 oz = 28.3495 g
- 1 kg = 1000 g

**Volume**:
- 1 cup = 236.588 ml
- 1 tbsp = 14.7868 ml
- 1 tsp = 4.92892 ml
- 1 fl oz = 29.5735 ml
- 1 L = 1000 ml

---

## Data Isolation & Security

### Row-Level Security

**Bakery-Scoped Queries** (Regular Users):
```typescript
// All queries must filter by user's bakeryId
const recipes = await prisma.recipe.findMany({
  where: { bakeryId: user.bakeryId }
});
```

**Platform Admin Queries**:
```typescript
// Platform admins can access all data
if (user.isPlatformAdmin) {
  const allRecipes = await prisma.recipe.findMany();
} else {
  const bakeryRecipes = await prisma.recipe.findMany({
    where: { bakeryId: user.bakeryId }
  });
}
```

### Delete Cascades

**Cascade Deletes** (automatic cleanup):
- Bakery → Users, Recipes, Ingredients, etc.
- Recipe → Sections → Section Ingredients
- Vendor → Contacts

**Restrict Deletes** (prevent data loss):
- Recipe ← BakeSheet (can't delete recipe with bake sheets)
- Ingredient ← RecipeSectionIngredient (can't delete ingredient in use)
- User ← InventoryTransaction (preserve audit trail)

**SetNull Deletes** (preserve records, remove reference):
- User → Bakery (if bakery deleted, user becomes platform-only)
- Vendor → Ingredient (ingredient remains, vendor removed)
- BakeSheet → User (completer) (preserve bake sheet, anonymize)

---

## Schema Relationships Diagram

```
┌─────────┐
│ Bakery  │
└────┬────┘
     │
     ├─────┬─────┬─────┬─────┬─────┐
     │     │     │     │     │     │
     v     v     v     v     v     v
  Users Recipe Ingred Vendor Equip BakeSheet
           │      │      │      │      │
           v      │      │      │      │
    RecipeSection │      │      │      │
           │      │      │      │      │
           v      v      v      │      │
    RecipeSectionIngredient     │      │
                  │              │      │
                  v              v      v
         InventoryTransaction ────┬────
                                  │
                                  v
                              BakeSheet
```

---

## Performance Considerations

### Indexed Fields

**Critical Indexes**:
- All foreign keys (automatic with Prisma)
- `bakeryId` on all tenant-scoped tables
- `isPlatformAdmin` on User
- Status fields (Equipment.status, BakeSheet.completed)
- Name fields for search (Recipe.name, Ingredient.name, Vendor.name)
- Timestamp fields for chronological queries

### Query Optimization

**Best Practices**:
1. Always scope by `bakeryId` first
2. Use `select` to fetch only needed fields
3. Batch operations where possible
4. Use Prisma's connection pooling
5. Index frequently filtered fields

**Example Optimized Query**:
```typescript
const recipes = await prisma.recipe.findMany({
  where: { bakeryId: user.bakeryId },
  select: {
    id: true,
    name: true,
    yield: true,
    totalCost: true,
  },
  orderBy: { name: 'asc' },
  take: 50,
});
```

---

## Migration Strategy

### Workflow
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (creates + applies migration)
3. Review generated SQL in `prisma/migrations/`
4. Test locally
5. Commit schema + migration files together
6. Deploy (migrations run automatically on Vercel)

### Critical Rules
- ❌ Never use `prisma db push` in production
- ❌ Never edit generated migration SQL
- ❌ Never deploy without committed migrations
- ✅ Always review migration SQL
- ✅ Always test migrations locally first
- ✅ Always commit schema and migrations together

---

## Next Steps

1. ✅ Schema defined
2. ⏳ Create initial migration (`npm run db:migrate`)
3. ⏳ Create seed data (Issue #10)
4. ⏳ Create Prisma client wrapper (`src/lib/prisma.ts`)
5. ⏳ Implement permission helpers (`src/lib/permissions.ts`)
