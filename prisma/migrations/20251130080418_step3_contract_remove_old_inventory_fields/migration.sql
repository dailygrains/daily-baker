/*
  Warnings:

  - You are about to drop the column `costPerUnit` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `currentQty` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `ingredientId` on the `inventory_transactions` table. All the data in the column will be lost.
  - Made the column `defaultUnit` on table `ingredients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `inventoryItemId` on table `inventory_transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_ingredientId_fkey";

-- DropIndex
DROP INDEX "inventory_transactions_ingredientId_idx";

-- AlterTable
ALTER TABLE "ingredients" DROP COLUMN "costPerUnit",
DROP COLUMN "currentQty",
DROP COLUMN "unit",
ALTER COLUMN "defaultUnit" SET NOT NULL;

-- AlterTable
ALTER TABLE "inventory_transactions" DROP COLUMN "ingredientId",
ALTER COLUMN "inventoryItemId" SET NOT NULL;
