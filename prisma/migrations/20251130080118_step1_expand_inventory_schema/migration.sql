-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "category" TEXT,
ADD COLUMN     "defaultUnit" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "reorderLevel" DECIMAL(10,3),
ALTER COLUMN "currentQty" DROP NOT NULL,
ALTER COLUMN "currentQty" DROP DEFAULT,
ALTER COLUMN "unit" DROP NOT NULL,
ALTER COLUMN "costPerUnit" DROP NOT NULL;

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "inventoryItemId" TEXT,
ADD COLUMN     "totalCost" DECIMAL(10,2),
ADD COLUMN     "unitCost" DECIMAL(10,2),
ALTER COLUMN "ingredientId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "vendorId" TEXT,
    "purchasePrice" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_bakeryId_idx" ON "inventory_items"("bakeryId");

-- CreateIndex
CREATE INDEX "inventory_items_ingredientId_idx" ON "inventory_items"("ingredientId");

-- CreateIndex
CREATE INDEX "inventory_items_vendorId_idx" ON "inventory_items"("vendorId");

-- CreateIndex
CREATE INDEX "inventory_items_expirationDate_idx" ON "inventory_items"("expirationDate");

-- CreateIndex
CREATE INDEX "ingredients_category_idx" ON "ingredients"("category");

-- CreateIndex
CREATE INDEX "inventory_transactions_inventoryItemId_idx" ON "inventory_transactions"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
