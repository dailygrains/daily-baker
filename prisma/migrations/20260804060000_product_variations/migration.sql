-- Restructures products into parent Product + ProductVariation (Square ITEM /
-- ITEM_VARIATION), moving sku, pricing, cost and the packaging BOM down to the
-- variation. Destructive column/table drops are safe here: products,
-- product_supplies and supplies contain no rows in any environment yet.

-- DropForeignKey
ALTER TABLE "baker"."product_supplies" DROP CONSTRAINT "product_supplies_productId_fkey";

-- DropForeignKey
ALTER TABLE "baker"."product_supplies" DROP CONSTRAINT "product_supplies_supplyId_fkey";

-- AlterTable
ALTER TABLE "baker"."products" DROP COLUMN "batchYieldQty",
DROP COLUMN "ingredientCost",
DROP COLUMN "laborCost",
DROP COLUMN "overheadCost",
DROP COLUMN "retailPrice",
DROP COLUMN "sku",
DROP COLUMN "supplyCost",
DROP COLUMN "targetMarginPct",
DROP COLUMN "totalCost",
DROP COLUMN "wholesalePrice",
ADD COLUMN     "squareItemId" VARCHAR(100);

-- DropTable
DROP TABLE "baker"."product_supplies";

-- CreateTable
CREATE TABLE "baker"."product_variations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sku" VARCHAR(100),
    "squareVariationId" VARCHAR(100),
    "unitWeightG" DECIMAL(10,2),
    "batchYieldQty" INTEGER,
    "ingredientCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplyCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overheadCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "retailPrice" DECIMAL(10,2),
    "wholesalePrice" DECIMAL(10,2),
    "targetMarginPct" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."product_variation_supplies" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "wasteFactor" DECIMAL(5,3) NOT NULL DEFAULT 1,
    "costOverride" DECIMAL(10,4),
    "notes" VARCHAR(500),

    CONSTRAINT "product_variation_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variations_squareVariationId_key" ON "baker"."product_variations"("squareVariationId");

-- CreateIndex
CREATE INDEX "product_variations_productId_idx" ON "baker"."product_variations"("productId");

-- CreateIndex
CREATE INDEX "product_variations_name_idx" ON "baker"."product_variations"("name");

-- CreateIndex
CREATE INDEX "product_variations_isActive_idx" ON "baker"."product_variations"("isActive");

-- CreateIndex
CREATE INDEX "product_variation_supplies_variationId_idx" ON "baker"."product_variation_supplies"("variationId");

-- CreateIndex
CREATE INDEX "product_variation_supplies_supplyId_idx" ON "baker"."product_variation_supplies"("supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variation_supplies_variationId_supplyId_key" ON "baker"."product_variation_supplies"("variationId", "supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_squareItemId_key" ON "baker"."products"("squareItemId");

-- AddForeignKey
ALTER TABLE "baker"."product_variations" ADD CONSTRAINT "product_variations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "baker"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."product_variation_supplies" ADD CONSTRAINT "product_variation_supplies_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "baker"."product_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."product_variation_supplies" ADD CONSTRAINT "product_variation_supplies_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "baker"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
