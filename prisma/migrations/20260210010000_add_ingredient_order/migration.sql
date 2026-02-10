-- Add order column to recipe_section_ingredients
ALTER TABLE "recipe_section_ingredients" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sequential order based on existing row creation order (by id)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "sectionId" ORDER BY id) - 1 AS rn
  FROM "recipe_section_ingredients"
)
UPDATE "recipe_section_ingredients" rsi
SET "order" = numbered.rn
FROM numbered
WHERE rsi.id = numbered.id;
