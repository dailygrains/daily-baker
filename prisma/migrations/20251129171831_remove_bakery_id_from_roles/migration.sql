-- Remove duplicate roles, keeping only the first occurrence of each role name
DELETE FROM "roles"
WHERE "id" NOT IN (
  SELECT MIN("id")
  FROM "roles"
  GROUP BY "name"
);

-- Drop the existing unique constraint on (bakeryId, name)
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_bakeryId_name_key";

-- Drop the index on bakeryId
DROP INDEX IF EXISTS "roles_bakeryId_idx";

-- Add unique constraint on name
ALTER TABLE "roles" ADD CONSTRAINT "roles_name_key" UNIQUE ("name");

-- Drop the bakeryId column
ALTER TABLE "roles" DROP COLUMN "bakeryId";
