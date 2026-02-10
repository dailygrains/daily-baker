-- Step 1: Add new column with default empty array
ALTER TABLE "recipe_sections" ADD COLUMN "bakersMathBaseIndices" JSONB NOT NULL DEFAULT '[]';

-- Step 2: Migrate existing data - where useBakersMath is true, convert single index to array
UPDATE "recipe_sections"
SET "bakersMathBaseIndices" = jsonb_build_array("bakersMathBaseIndex")
WHERE "useBakersMath" = true;

-- Step 3: Drop old column
ALTER TABLE "recipe_sections" DROP COLUMN "bakersMathBaseIndex";
