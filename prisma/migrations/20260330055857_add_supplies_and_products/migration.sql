-- CreateEnum
CREATE TYPE "baker"."SupplyCategory" AS ENUM ('PACKAGING', 'DISPOSABLE', 'LABEL', 'CLEANING', 'OTHER');

-- CreateTable
CREATE TABLE "baker"."supplies" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" VARCHAR(100),
    "category" "baker"."SupplyCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "unitsPerCase" INTEGER,
    "costPerUnit" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "quantityOnHand" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "lowStockThreshold" DECIMAL(10,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."supply_vendors" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."products" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" VARCHAR(100),
    "description" TEXT,
    "recipeId" TEXT NOT NULL,
    "recipeScale" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "batchYieldQty" INTEGER NOT NULL,
    "ingredientCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplyCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overheadCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "retailPrice" DECIMAL(10,2),
    "wholesalePrice" DECIMAL(10,2),
    "targetMarginPct" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."product_supplies" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "wasteFactor" DECIMAL(5,3) NOT NULL DEFAULT 1,
    "costOverride" DECIMAL(10,4),
    "notes" VARCHAR(500),

    CONSTRAINT "product_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplies_bakeryId_idx" ON "baker"."supplies"("bakeryId");

-- CreateIndex
CREATE INDEX "supplies_name_idx" ON "baker"."supplies"("name");

-- CreateIndex
CREATE INDEX "supplies_category_idx" ON "baker"."supplies"("category");

-- CreateIndex
CREATE INDEX "supplies_isActive_idx" ON "baker"."supplies"("isActive");

-- CreateIndex
CREATE INDEX "supply_vendors_supplyId_idx" ON "baker"."supply_vendors"("supplyId");

-- CreateIndex
CREATE INDEX "supply_vendors_vendorId_idx" ON "baker"."supply_vendors"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "supply_vendors_supplyId_vendorId_key" ON "baker"."supply_vendors"("supplyId", "vendorId");

-- CreateIndex
CREATE INDEX "products_bakeryId_idx" ON "baker"."products"("bakeryId");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "baker"."products"("name");

-- CreateIndex
CREATE INDEX "products_recipeId_idx" ON "baker"."products"("recipeId");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "baker"."products"("isActive");

-- CreateIndex
CREATE INDEX "product_supplies_productId_idx" ON "baker"."product_supplies"("productId");

-- CreateIndex
CREATE INDEX "product_supplies_supplyId_idx" ON "baker"."product_supplies"("supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "product_supplies_productId_supplyId_key" ON "baker"."product_supplies"("productId", "supplyId");

-- AddForeignKey
ALTER TABLE "baker"."supplies" ADD CONSTRAINT "supplies_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."supply_vendors" ADD CONSTRAINT "supply_vendors_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "baker"."supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."supply_vendors" ADD CONSTRAINT "supply_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "baker"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."products" ADD CONSTRAINT "products_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."products" ADD CONSTRAINT "products_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "baker"."recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."product_supplies" ADD CONSTRAINT "product_supplies_productId_fkey" FOREIGN KEY ("productId") REFERENCES "baker"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."product_supplies" ADD CONSTRAINT "product_supplies_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "baker"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
