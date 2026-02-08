-- CreateTable
CREATE TABLE "tag_types" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "tagTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_tags" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tag_types_bakeryId_idx" ON "tag_types"("bakeryId");

-- CreateIndex
CREATE UNIQUE INDEX "tag_types_bakeryId_name_key" ON "tag_types"("bakeryId", "name");

-- CreateIndex
CREATE INDEX "tags_bakeryId_idx" ON "tags"("bakeryId");

-- CreateIndex
CREATE INDEX "tags_tagTypeId_idx" ON "tags"("tagTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_bakeryId_tagTypeId_name_key" ON "tags"("bakeryId", "tagTypeId", "name");

-- CreateIndex
CREATE INDEX "entity_tags_tagId_idx" ON "entity_tags"("tagId");

-- CreateIndex
CREATE INDEX "entity_tags_entityType_entityId_idx" ON "entity_tags"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_tags_tagId_entityType_entityId_key" ON "entity_tags"("tagId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "tag_types" ADD CONSTRAINT "tag_types_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_tagTypeId_fkey" FOREIGN KEY ("tagTypeId") REFERENCES "tag_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
