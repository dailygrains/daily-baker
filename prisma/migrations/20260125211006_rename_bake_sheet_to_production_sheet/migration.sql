-- Rename bake_sheets table to production_sheets (preserves data)

-- Step 1: Drop foreign keys that reference the table
ALTER TABLE "inventory_usages" DROP CONSTRAINT IF EXISTS "inventory_usages_bakeSheetId_fkey";
ALTER TABLE "bake_sheets" DROP CONSTRAINT IF EXISTS "bake_sheets_bakeryId_fkey";
ALTER TABLE "bake_sheets" DROP CONSTRAINT IF EXISTS "bake_sheets_completedBy_fkey";
ALTER TABLE "bake_sheets" DROP CONSTRAINT IF EXISTS "bake_sheets_recipeId_fkey";

-- Step 2: Drop indexes on the old table
DROP INDEX IF EXISTS "bake_sheets_bakeryId_idx";
DROP INDEX IF EXISTS "bake_sheets_recipeId_idx";
DROP INDEX IF EXISTS "bake_sheets_completed_idx";
DROP INDEX IF EXISTS "bake_sheets_createdAt_idx";
DROP INDEX IF EXISTS "inventory_usages_bakeSheetId_idx";

-- Step 3: Rename the column in inventory_usages
ALTER TABLE "inventory_usages" RENAME COLUMN "bakeSheetId" TO "productionSheetId";

-- Step 4: Rename the table
ALTER TABLE "bake_sheets" RENAME TO "production_sheets";

-- Step 5: Rename the primary key constraint
ALTER TABLE "production_sheets" RENAME CONSTRAINT "bake_sheets_pkey" TO "production_sheets_pkey";

-- Step 6: Recreate indexes with new names
CREATE INDEX "production_sheets_bakeryId_idx" ON "production_sheets"("bakeryId");
CREATE INDEX "production_sheets_recipeId_idx" ON "production_sheets"("recipeId");
CREATE INDEX "production_sheets_completed_idx" ON "production_sheets"("completed");
CREATE INDEX "production_sheets_createdAt_idx" ON "production_sheets"("createdAt");
CREATE INDEX "inventory_usages_productionSheetId_idx" ON "inventory_usages"("productionSheetId");

-- Step 7: Recreate foreign keys with new names
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_productionSheetId_fkey"
  FOREIGN KEY ("productionSheetId") REFERENCES "production_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_sheets" ADD CONSTRAINT "production_sheets_bakeryId_fkey"
  FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_sheets" ADD CONSTRAINT "production_sheets_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_sheets" ADD CONSTRAINT "production_sheets_completedBy_fkey"
  FOREIGN KEY ("completedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
