-- CreateTable
CREATE TABLE "baker"."api_keys" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "baker"."api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_bakeryId_idx" ON "baker"."api_keys"("bakeryId");

-- CreateIndex
CREATE INDEX "api_keys_prefix_idx" ON "baker"."api_keys"("prefix");

-- AddForeignKey
ALTER TABLE "baker"."api_keys" ADD CONSTRAINT "api_keys_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
