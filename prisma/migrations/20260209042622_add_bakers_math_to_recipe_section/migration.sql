-- AlterTable
ALTER TABLE "recipe_sections" ADD COLUMN     "bakersMathBaseIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "useBakersMath" BOOLEAN NOT NULL DEFAULT false;
