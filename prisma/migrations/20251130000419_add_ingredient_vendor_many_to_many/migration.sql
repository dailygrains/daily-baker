-- CreateTable
CREATE TABLE "ingredient_vendors" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingredient_vendors_ingredientId_idx" ON "ingredient_vendors"("ingredientId");

-- CreateIndex
CREATE INDEX "ingredient_vendors_vendorId_idx" ON "ingredient_vendors"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_vendors_ingredientId_vendorId_key" ON "ingredient_vendors"("ingredientId", "vendorId");

-- AddForeignKey
ALTER TABLE "ingredient_vendors" ADD CONSTRAINT "ingredient_vendors_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_vendors" ADD CONSTRAINT "ingredient_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing vendor assignments to the new table
INSERT INTO "ingredient_vendors" ("id", "ingredientId", "vendorId", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id" as "ingredientId",
    "vendorId",
    CURRENT_TIMESTAMP
FROM "ingredients"
WHERE "vendorId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_vendorId_fkey";

-- DropIndex
DROP INDEX "ingredients_vendorId_idx";

-- AlterTable
ALTER TABLE "ingredients" DROP COLUMN "vendorId";
