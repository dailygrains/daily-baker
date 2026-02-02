-- Split yield field into yieldQty (int) and yieldUnit (string)

-- Add new columns with defaults
ALTER TABLE "recipes" ADD COLUMN "yieldQty" INTEGER DEFAULT 1;
ALTER TABLE "recipes" ADD COLUMN "yieldUnit" TEXT DEFAULT '';

-- Migrate existing data: extract number from start of yield string
-- e.g., "2 loaves" -> yieldQty=2, yieldUnit="loaves"
UPDATE "recipes"
SET
  "yieldQty" = COALESCE(
    NULLIF(REGEXP_REPLACE("yield", '[^0-9].*', '', 'g'), '')::INTEGER,
    1
  ),
  "yieldUnit" = TRIM(REGEXP_REPLACE("yield", '^[0-9]+\s*', '', 'g'));

-- Make columns required (remove defaults)
ALTER TABLE "recipes" ALTER COLUMN "yieldQty" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "yieldQty" DROP DEFAULT;
ALTER TABLE "recipes" ALTER COLUMN "yieldUnit" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "yieldUnit" DROP DEFAULT;

-- Drop old yield column
ALTER TABLE "recipes" DROP COLUMN "yield";
