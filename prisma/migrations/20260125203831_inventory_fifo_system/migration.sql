/*
  Warnings:

  - You are about to drop the column `costPerUnit` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `currentQty` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the `inventory_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UsageReason" AS ENUM ('USE', 'WASTE', 'ADJUST');

-- DropForeignKey
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_bakeSheetId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_ingredientId_fkey";

-- AlterTable
ALTER TABLE "ingredients" DROP COLUMN "costPerUnit",
DROP COLUMN "currentQty";

-- DropTable
DROP TABLE "inventory_transactions";

-- DropEnum
DROP TYPE "TransactionType";

-- CreateTable
CREATE TABLE "inventories" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "displayUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "purchaseQty" DECIMAL(10,3) NOT NULL,
    "remainingQty" DECIMAL(10,3) NOT NULL,
    "purchaseUnit" TEXT NOT NULL,
    "costPerUnit" DECIMAL(10,4) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "vendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_usages" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "shortfall" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "reason" "UsageReason" NOT NULL,
    "bakeSheetId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventories_ingredientId_key" ON "inventories"("ingredientId");

-- CreateIndex
CREATE INDEX "inventories_bakeryId_idx" ON "inventories"("bakeryId");

-- CreateIndex
CREATE INDEX "inventory_lots_inventoryId_idx" ON "inventory_lots"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_lots_purchasedAt_idx" ON "inventory_lots"("purchasedAt");

-- CreateIndex
CREATE INDEX "inventory_lots_expiresAt_idx" ON "inventory_lots"("expiresAt");

-- CreateIndex
CREATE INDEX "inventory_lots_vendorId_idx" ON "inventory_lots"("vendorId");

-- CreateIndex
CREATE INDEX "inventory_usages_lotId_idx" ON "inventory_usages"("lotId");

-- CreateIndex
CREATE INDEX "inventory_usages_bakeSheetId_idx" ON "inventory_usages"("bakeSheetId");

-- CreateIndex
CREATE INDEX "inventory_usages_createdBy_idx" ON "inventory_usages"("createdBy");

-- CreateIndex
CREATE INDEX "inventory_usages_createdAt_idx" ON "inventory_usages"("createdAt");

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_bakeSheetId_fkey" FOREIGN KEY ("bakeSheetId") REFERENCES "bake_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
