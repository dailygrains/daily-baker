# Seed Data System Guide

This guide explains Daily Baker's comprehensive seed data system for development and testing.

## Purpose

The seed system provides:
- **Realistic demo data** for development and testing
- **Multiple bakeries** with different configurations
- **Sample recipes** covering various categories
- **Inventory data** with transactions
- **User roles** and permissions setup
- **Quick database reset** for testing

---

## Seed Data Overview

### 1. Bakeries (3)

| Bakery Name | Location | Focus |
|------------|----------|-------|
| **Artisan Sourdough Co.** | Portland, OR | Sourdough and artisan breads |
| **Sweet Treats Pastry Shop** | Austin, TX | Pastries and desserts |
| **Rustic Loaves Bakery** | Brooklyn, NY | Traditional breads |

**Artisan Sourdough** is the primary bakery with full seed data. Other bakeries have minimal setup.

### 2. Users (5)

| Email | Name | Bakery | Role | Platform Admin |
|-------|------|--------|------|----------------|
| `admin@dailybaker.com` | Platform Admin | None | N/A | ✅ Yes |
| `owner@artisansourdough.com` | Sarah Johnson | Artisan Sourdough | Owner | ❌ No |
| `manager@artisansourdough.com` | Michael Chen | Artisan Sourdough | Manager | ❌ No |
| `baker@artisansourdough.com` | Emma Rodriguez | Artisan Sourdough | Baker | ❌ No |
| `owner@sweettreats.com` | David Martinez | Sweet Treats | Owner | ❌ No |

**Note**: These are Clerk IDs for development only. Real users will sign up via Clerk authentication.

### 3. Roles (4)

**Artisan Sourdough Roles**:
- **Owner**: Full access to all bakery operations
- **Manager**: Manage daily operations, limited admin access
- **Baker**: Execute baking operations, view-only for most data

**Sweet Treats Roles**:
- **Owner**: Full access

**Permissions by Role**:

| Permission | Owner | Manager | Baker |
|-----------|-------|---------|-------|
| Bakery Settings | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Recipe Create/Edit | ✅ | ✅ | ❌ |
| Recipe Delete | ✅ | ❌ | ❌ |
| Inventory Edit | ✅ | ✅ | ❌ |
| Inventory View | ✅ | ✅ | ✅ |
| Create Bake Sheets | ✅ | ✅ | ❌ |
| Complete Bake Sheets | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ❌ |
| Export Reports | ✅ | ❌ | ❌ |
| Manage Equipment | ✅ | ❌ | ❌ |
| Manage Vendors | ✅ | ❌ | ❌ |

### 4. Vendors (2)

**Northwest Grain Suppliers**
- Type: Ingredients
- Supplies: Flour, yeast, salt, sugar
- Contact: Tom Williams (Sales Rep)

**Valley Fresh Dairy**
- Type: Dairy
- Supplies: Butter, milk, eggs
- Contact: Lisa Anderson (Account Manager)

### 5. Ingredients (10)

| Ingredient | Category | Current Qty | Unit | Min | Max | Cost/Unit |
|-----------|----------|-------------|------|-----|-----|-----------|
| Bread Flour (Organic) | Flour | 250 | kg | 50 | 500 | $2.50/kg |
| Whole Wheat Flour | Flour | 100 | kg | 25 | 200 | $3.00/kg |
| Rye Flour | Flour | 50 | kg | 10 | 100 | $3.50/kg |
| Sea Salt | Salt | 20 | kg | 5 | 50 | $8.00/kg |
| Filtered Water | Water | 500 | L | 100 | 1000 | $0.01/L |
| Active Dry Yeast | Leavening | 5 | kg | 1 | 10 | $15.00/kg |
| Unsalted Butter (Organic) | Dairy | 30 | kg | 10 | 50 | $12.00/kg |
| Whole Milk | Dairy | 40 | L | 10 | 100 | $2.00/L |
| Large Eggs (Organic) | Eggs | 600 | unit | 100 | 1000 | $0.50/unit |
| Granulated Sugar | Sugar | 75 | kg | 20 | 150 | $2.00/kg |

### 6. Equipment (6)

| Equipment | Category | Status | Location |
|-----------|----------|--------|----------|
| Spiral Mixer (80L) | Mixers | ✅ Operational | Main Production |
| Deck Oven (3-deck) | Ovens | ✅ Operational | Baking Area |
| Proofing Cabinet | Proofing | ✅ Operational | Proofing Room |
| Dough Sheeter | Sheeters | ✅ Operational | Lamination Station |
| Walk-in Refrigerator | Refrigeration | ✅ Operational | Cold Storage |
| Stand Mixer (20qt) | Mixers | 🔧 Maintenance | Pastry Station |

### 7. Recipes (3)

**Classic Sourdough Bread**
- Category: Bread
- Yield: 2 loaves
- Difficulty: Medium
- Time: 25.75 hours (including fermentation)
- Sections: Levain, Main Dough
- Instructions: Full MDX with step-by-step process

**Honey Whole Wheat Bread**
- Category: Bread
- Yield: 2 loaves
- Difficulty: Easy
- Time: 3.5 hours
- Sections: Ingredients
- Instructions: Complete mixing, rising, and baking guide

**Butter Croissants**
- Category: Pastry
- Yield: 24 croissants
- Difficulty: Hard
- Time: 20 hours (including overnight rest)
- Sections: Dough, Butter Block, Egg Wash
- Instructions: Lamination and shaping techniques

### 8. Inventory Transactions (4)

| Type | Ingredient | Quantity | Amount | Notes |
|------|-----------|----------|--------|-------|
| Purchase | Bread Flour | +250 kg | $625 | Weekly delivery |
| Purchase | Butter | +30 kg | $360 | Monthly order |
| Usage | Bread Flour | -50 kg | — | Sourdough production |
| Adjustment | Whole Wheat | -5 kg | — | Damaged bag |

### 9. Bake Sheets (3)

| Recipe | Date | Quantity | Status | Assigned To |
|--------|------|----------|--------|-------------|
| Classic Sourdough | Yesterday | 50 loaves | ✅ Completed | Emma Rodriguez |
| Honey Whole Wheat | Today | 30 loaves | 🔄 In Progress | Emma Rodriguez |
| Butter Croissants | Tomorrow | 100 croissants | 📅 Scheduled | Emma Rodriguez |

### 10. Unit Conversions (14)

Common conversions:
- **Weight**: kg ↔ g, lb ↔ oz, kg ↔ lb
- **Volume**: L ↔ mL, gal ↔ qt, cup ↔ mL, tbsp ↔ mL, tsp ↔ mL

---

## Running the Seed Script

### Quick Start

```bash
# Reset database and seed
npm run db:migrate:reset

# Seed only (without reset)
npm run db:seed
```

### Step-by-Step

**1. Ensure database is created**:
```bash
createdb daily_baker  # Or use your database management tool
```

**2. Run migrations**:
```bash
npm run db:migrate
```

**3. Seed the database**:
```bash
npm run db:seed
```

**Output**:
```
🌱 Starting database seed...

🗑️  Cleaning existing data...
✅ Cleanup complete

🏪 Creating bakeries...
✅ Created 3 bakeries

👔 Creating roles...
✅ Created 4 roles

👥 Creating users...
✅ Created 5 users

⚖️  Creating unit conversions...
✅ Created 14 unit conversions

🚚 Creating vendors...
✅ Created 2 vendors

🧪 Creating ingredients...
✅ Created 10 ingredients

🔧 Creating equipment...
✅ Created 6 pieces of equipment

📝 Creating recipes...
✅ Created 3 recipes with sections

📦 Creating inventory transactions...
✅ Created 4 inventory transactions

🥖 Creating bake sheets...
✅ Created 3 bake sheets

🎉 Database seed completed successfully!
```

---

## Environment Variables

The seed script uses these environment variables:

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/daily_baker"
DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/daily_baker"

# Optional: Override platform admin email (defaults to admin@dailybaker.com)
PLATFORM_ADMIN_EMAIL=your.email@example.com

# Environment (seed clears data only in development)
NODE_ENV=development
```

---

## Customizing Seed Data

### Add More Bakeries

Edit `prisma/seed.ts`:

```typescript
const myBakery = await prisma.bakery.create({
  data: {
    name: 'My Custom Bakery',
    slug: 'my-custom-bakery',
    address: '123 Baker Street',
    city: 'Your City',
    state: 'YS',
    zipCode: '12345',
    country: 'USA',
    phone: '(555) 123-4567',
    email: 'hello@mycustombakery.com',
    timezone: 'America/New_York',
    isActive: true,
  },
});
```

### Add More Ingredients

```typescript
const customIngredient = await prisma.ingredient.create({
  data: {
    bakeryId: artisanBakery.id,
    name: 'Custom Ingredient',
    category: 'Category',
    currentQuantity: 100,
    unit: 'kg',
    minQuantity: 20,
    maxQuantity: 200,
    cost: 5.00,
    costUnit: 'kg',
    vendorId: yourVendor.id,  // Optional
  },
});
```

### Add More Recipes

```typescript
const customRecipe = await prisma.recipe.create({
  data: {
    bakeryId: artisanBakery.id,
    name: 'Custom Recipe',
    description: 'Description of your recipe',
    category: 'Bread',
    yieldQuantity: 1,
    yieldUnit: 'loaf',
    prepTimeMinutes: 30,
    cookTimeMinutes: 45,
    totalTimeMinutes: 75,
    difficulty: 'Easy',
    instructions: '# Recipe Instructions\n\nYour instructions here in MDX format.',
    isPublished: true,
    createdById: artisanOwner.id,
  },
});

// Add recipe sections
await prisma.recipeSection.create({
  data: {
    recipeId: customRecipe.id,
    name: 'Ingredients',
    orderIndex: 0,
    ingredients: {
      create: [
        {
          ingredientId: breadFlour.id,
          quantity: 500,
          unit: 'g',
          notes: 'Optional notes',
        },
      ],
    },
  },
});
```

---

## Testing with Seed Data

### 1. Test Multi-Tenancy

Switch between bakeries to verify data isolation:

```typescript
// As Artisan Sourdough owner
// Should see only Artisan Sourdough data

// As Sweet Treats owner
// Should see only Sweet Treats data

// As Platform Admin
// Should see all bakeries
```

### 2. Test Permissions

Log in as different roles:

```typescript
// As Owner (owner@artisansourdough.com)
// - Can create/edit/delete recipes
// - Can manage users
// - Can view reports

// As Manager (manager@artisansourdough.com)
// - Can create/edit recipes (not delete)
// - Cannot manage users
// - Can view reports (not export)

// As Baker (baker@artisansourdough.com)
// - Can only view recipes
// - Can complete bake sheets
// - Cannot view reports
```

### 3. Test Recipe Scaling

Use recipes with proper ingredient relationships:

```typescript
// Classic Sourdough recipe has:
// - Levain section: 100g flour, 100mL water
// - Main dough section: 900g flour, 630mL water, 20g salt
// - Total: 1000g flour, 730mL water, 20g salt for 2 loaves

// Scale to 10 loaves (5x):
// - 5000g flour, 3650mL water, 100g salt
```

### 4. Test Inventory Tracking

Monitor ingredient usage:

```typescript
// 1. Check current bread flour: 250kg
// 2. Complete sourdough bake sheet (uses 50kg)
// 3. Verify flour now at 200kg
// 4. Check inventory transaction created
```

---

## Resetting Data

### Development Reset

**Full reset** (drops database, recreates, seeds):
```bash
npm run db:migrate:reset
```

**Warning**: This **permanently deletes all data**!

### Production

**Never run seed script in production!**

The seed script checks `NODE_ENV` and only clears data in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  // Only clears data in development
  await prisma.bakeSheet.deleteMany();
  // ... more cleanup
}
```

---

## Clerk Integration

### Demo User Clerk IDs

The seed script creates users with placeholder Clerk IDs:

```typescript
clerkId: 'user_artisan_owner'  // Not a real Clerk ID
```

### Real User Flow

In production:

1. User signs up via Clerk
2. Clerk creates user with real `clerkId`
3. `getCurrentUser()` in `lib/clerk.ts` syncs to database
4. User gets assigned to bakery by platform admin or owner

### Linking Seed Users to Clerk (Development)

To test with real Clerk authentication:

1. Sign up in your app with `owner@artisansourdough.com`
2. Get the real Clerk ID from Clerk Dashboard
3. Update the user in database:

```sql
UPDATE users
SET "clerkId" = 'user_real_clerk_id_from_dashboard'
WHERE email = 'owner@artisansourdough.com';
```

Or use Prisma Studio:
```bash
npm run db:studio
# Navigate to users table
# Edit clerkId for the user
```

---

## Troubleshooting

### "Table does not exist" Error

**Cause**: Migrations not run

**Fix**:
```bash
npm run db:migrate
npm run db:seed
```

### "Unique constraint failed" Error

**Cause**: Seed data already exists

**Fix**:
```bash
# Clear and re-seed
npm run db:migrate:reset
```

### Seed Script Fails Midway

**Cause**: Partial data created before error

**Fix**:
```bash
# Clear all data manually
npm run db:studio
# Delete all records from all tables
# Or drop and recreate database
dropdb daily_baker && createdb daily_baker
npm run db:migrate
npm run db:seed
```

### Missing Dependencies

**Cause**: `ts-node` not installed

**Fix**:
```bash
npm install -D ts-node
```

---

## Seed Data for Testing

### Use Cases

1. **Frontend Development**
   - Test UI with realistic data
   - Multiple bakeries, users, recipes
   - Various statuses (completed, in-progress, scheduled)

2. **API Testing**
   - Test CRUD operations
   - Verify multi-tenant isolation
   - Check permission enforcement

3. **Database Schema Validation**
   - Verify relationships work correctly
   - Test cascading deletes
   - Validate constraints

4. **Demo and Screenshots**
   - Realistic data for documentation
   - Screenshots for marketing
   - Demo for stakeholders

---

## Extending the Seed System

### Add Seasonal Recipes

```typescript
// Add holiday/seasonal recipes
if (isDecember()) {
  await createHolidayRecipes();
}
```

### Add Historical Data

```typescript
// Create past bake sheets for reporting
for (let i = 30; i > 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);

  await prisma.bakeSheet.create({
    data: {
      recipeId: sourdoughRecipe.id,
      bakeryId: artisanBakery.id,
      scheduledDate: date,
      quantity: 50,
      status: 'completed',
      completedAt: date,
      completedById: artisanBaker.id,
    },
  });
}
```

### Add Bulk Transactions

```typescript
// Generate random inventory transactions
for (let i = 0; i < 100; i++) {
  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: randomIngredient(),
      bakeryId: artisanBakery.id,
      type: randomType(),
      quantity: randomQuantity(),
      unit: 'kg',
      createdById: randomUser(),
    },
  });
}
```

---

## Resources

### Documentation

- [Prisma Seeding Guide](https://www.prisma.io/docs/guides/database/seed-database)
- [TypeScript Node](https://typestrong.org/ts-node/)

### Related Daily Baker Docs

- [Database Setup](./database-setup.md)
- [Schema Documentation](./schema-documentation.md)
- [Clerk Setup](./clerk-setup.md)

---

## Summary

The Daily Baker seed system provides:

✅ **3 bakeries** with different configurations
✅ **5 users** with various roles and permissions
✅ **10 ingredients** with realistic quantities and costs
✅ **3 recipes** covering bread and pastry categories
✅ **6 equipment** items with different statuses
✅ **2 vendors** with contacts
✅ **14 unit conversions** for recipe scaling
✅ **4 inventory transactions** demonstrating flow
✅ **3 bake sheets** in different states

**Perfect for**:
- Local development
- Frontend prototyping
- API testing
- Demo purposes
- Screenshot generation

**Never use in production!** Real data should come from user signups and bakery operations.
