-- CreateTable
CREATE TABLE "user_bakeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bakeries_pkey" PRIMARY KEY ("id")
);

-- Migrate existing bakeryId data to join table
INSERT INTO "user_bakeries" ("id", "userId", "bakeryId", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "bakeryId",
    CURRENT_TIMESTAMP
FROM "users"
WHERE "bakeryId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_bakeryId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "users_bakeryId_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "bakeryId";

-- CreateIndex
CREATE INDEX "user_bakeries_userId_idx" ON "user_bakeries"("userId");

-- CreateIndex
CREATE INDEX "user_bakeries_bakeryId_idx" ON "user_bakeries"("bakeryId");

-- CreateIndex
CREATE UNIQUE INDEX "user_bakeries_userId_bakeryId_key" ON "user_bakeries"("userId", "bakeryId");

-- AddForeignKey
ALTER TABLE "user_bakeries" ADD CONSTRAINT "user_bakeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bakeries" ADD CONSTRAINT "user_bakeries_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
