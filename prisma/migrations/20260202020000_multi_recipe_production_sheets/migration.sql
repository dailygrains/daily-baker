-- Multi-Recipe Production Sheets Migration
-- This migration:
-- 1. Creates the production_sheet_recipes join table
-- 2. Migrates existing data from production_sheets to the join table
-- 3. Adds scheduledFor and description columns
-- 4. Drops old columns (recipeId, scale, quantity)

-- Step 1: Create the new production_sheet_recipes table
CREATE TABLE "production_sheet_recipes" (
    "id" TEXT NOT NULL,
    "productionSheetId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "scale" DECIMAL(5,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_sheet_recipes_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes on the new table
CREATE INDEX "production_sheet_recipes_productionSheetId_idx" ON "production_sheet_recipes"("productionSheetId");
CREATE INDEX "production_sheet_recipes_recipeId_idx" ON "production_sheet_recipes"("recipeId");
CREATE UNIQUE INDEX "production_sheet_recipes_productionSheetId_recipeId_key" ON "production_sheet_recipes"("productionSheetId", "recipeId");

-- Step 3: Add foreign key constraints
ALTER TABLE "production_sheet_recipes" ADD CONSTRAINT "production_sheet_recipes_productionSheetId_fkey" FOREIGN KEY ("productionSheetId") REFERENCES "production_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_sheet_recipes" ADD CONSTRAINT "production_sheet_recipes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Migrate existing data from production_sheets to production_sheet_recipes
-- Generate cuid-like IDs using a combination of timestamp and random characters
INSERT INTO "production_sheet_recipes" ("id", "productionSheetId", "recipeId", "scale", "order", "createdAt")
SELECT
    CONCAT('clps', SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 21)) as id,
    ps."id" as "productionSheetId",
    ps."recipeId" as "recipeId",
    ps."scale" as "scale",
    0 as "order",
    ps."createdAt" as "createdAt"
FROM "production_sheets" ps
WHERE ps."recipeId" IS NOT NULL;

-- Step 5: Add new columns to production_sheets
ALTER TABLE "production_sheets" ADD COLUMN "description" TEXT;
ALTER TABLE "production_sheets" ADD COLUMN "scheduledFor" TIMESTAMP(3);

-- Step 6: Add index for scheduledFor
CREATE INDEX "production_sheets_scheduledFor_idx" ON "production_sheets"("scheduledFor");

-- Step 7: Drop old foreign key constraint
ALTER TABLE "production_sheets" DROP CONSTRAINT IF EXISTS "production_sheets_recipeId_fkey";

-- Step 8: Drop old index
DROP INDEX IF EXISTS "production_sheets_recipeId_idx";

-- Step 9: Drop old columns
ALTER TABLE "production_sheets" DROP COLUMN "recipeId";
ALTER TABLE "production_sheets" DROP COLUMN "scale";
ALTER TABLE "production_sheets" DROP COLUMN "quantity";
