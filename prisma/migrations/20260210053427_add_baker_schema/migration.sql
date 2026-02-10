-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "baker";

-- CreateEnum
CREATE TYPE "baker"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "baker"."UsageReason" AS ENUM ('USE', 'WASTE', 'ADJUST');

-- CreateEnum
CREATE TYPE "baker"."EquipmentStatus" AS ENUM ('CONSIDERING', 'ORDERED', 'RECEIVED', 'IN_USE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "baker"."ActivityType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'INVITE', 'ASSIGN', 'REVOKE', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "baker"."bakeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,

    CONSTRAINT "bakeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."user_bakeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bakeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bakeryId" TEXT,
    "roleId" TEXT,
    "status" "baker"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."recipes" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "yieldQty" INTEGER NOT NULL,
    "yieldUnit" TEXT NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."recipe_sections" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "useBakersMath" BOOLEAN NOT NULL DEFAULT false,
    "bakersMathBaseIndices" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."recipe_section_ingredients" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "preparation" VARCHAR(200),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_section_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."ingredients" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."inventories" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "displayUnit" TEXT NOT NULL,
    "lowStockThreshold" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."inventory_lots" (
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
CREATE TABLE "baker"."inventory_usages" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "shortfall" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "reason" "baker"."UsageReason" NOT NULL,
    "productionSheetId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."vendors" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."ingredient_vendors" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."vendor_contacts" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."equipment" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "baker"."EquipmentStatus" NOT NULL DEFAULT 'CONSIDERING',
    "vendorId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "serialNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."production_sheets" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "description" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "snapshotData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."production_sheet_recipes" (
    "id" TEXT NOT NULL,
    "productionSheetId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "scale" DECIMAL(5,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_sheet_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."unit_conversions" (
    "id" TEXT NOT NULL,
    "fromUnit" TEXT NOT NULL,
    "toUnit" TEXT NOT NULL,
    "factor" DECIMAL(15,6) NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."activity_logs" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT,
    "userId" TEXT NOT NULL,
    "action" "baker"."ActivityType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."tag_types" (
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
CREATE TABLE "baker"."tags" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "tagTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker"."entity_tags" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bakeries_slug_key" ON "baker"."bakeries"("slug");

-- CreateIndex
CREATE INDEX "bakeries_isActive_idx" ON "baker"."bakeries"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "baker"."users"("clerkId");

-- CreateIndex
CREATE INDEX "users_isPlatformAdmin_idx" ON "baker"."users"("isPlatformAdmin");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "baker"."users"("clerkId");

-- CreateIndex
CREATE INDEX "user_bakeries_userId_idx" ON "baker"."user_bakeries"("userId");

-- CreateIndex
CREATE INDEX "user_bakeries_bakeryId_idx" ON "baker"."user_bakeries"("bakeryId");

-- CreateIndex
CREATE UNIQUE INDEX "user_bakeries_userId_bakeryId_key" ON "baker"."user_bakeries"("userId", "bakeryId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "baker"."invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "baker"."invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "baker"."invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "baker"."invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_createdBy_idx" ON "baker"."invitations"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "baker"."roles"("name");

-- CreateIndex
CREATE INDEX "recipes_bakeryId_idx" ON "baker"."recipes"("bakeryId");

-- CreateIndex
CREATE INDEX "recipes_name_idx" ON "baker"."recipes"("name");

-- CreateIndex
CREATE INDEX "recipe_sections_recipeId_idx" ON "baker"."recipe_sections"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_sections_order_idx" ON "baker"."recipe_sections"("order");

-- CreateIndex
CREATE INDEX "recipe_section_ingredients_sectionId_idx" ON "baker"."recipe_section_ingredients"("sectionId");

-- CreateIndex
CREATE INDEX "recipe_section_ingredients_ingredientId_idx" ON "baker"."recipe_section_ingredients"("ingredientId");

-- CreateIndex
CREATE INDEX "ingredients_bakeryId_idx" ON "baker"."ingredients"("bakeryId");

-- CreateIndex
CREATE INDEX "ingredients_name_idx" ON "baker"."ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_ingredientId_key" ON "baker"."inventories"("ingredientId");

-- CreateIndex
CREATE INDEX "inventories_bakeryId_idx" ON "baker"."inventories"("bakeryId");

-- CreateIndex
CREATE INDEX "inventory_lots_inventoryId_idx" ON "baker"."inventory_lots"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_lots_purchasedAt_idx" ON "baker"."inventory_lots"("purchasedAt");

-- CreateIndex
CREATE INDEX "inventory_lots_expiresAt_idx" ON "baker"."inventory_lots"("expiresAt");

-- CreateIndex
CREATE INDEX "inventory_lots_vendorId_idx" ON "baker"."inventory_lots"("vendorId");

-- CreateIndex
CREATE INDEX "inventory_usages_lotId_idx" ON "baker"."inventory_usages"("lotId");

-- CreateIndex
CREATE INDEX "inventory_usages_productionSheetId_idx" ON "baker"."inventory_usages"("productionSheetId");

-- CreateIndex
CREATE INDEX "inventory_usages_createdBy_idx" ON "baker"."inventory_usages"("createdBy");

-- CreateIndex
CREATE INDEX "inventory_usages_createdAt_idx" ON "baker"."inventory_usages"("createdAt");

-- CreateIndex
CREATE INDEX "vendors_bakeryId_idx" ON "baker"."vendors"("bakeryId");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "baker"."vendors"("name");

-- CreateIndex
CREATE INDEX "ingredient_vendors_ingredientId_idx" ON "baker"."ingredient_vendors"("ingredientId");

-- CreateIndex
CREATE INDEX "ingredient_vendors_vendorId_idx" ON "baker"."ingredient_vendors"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_vendors_ingredientId_vendorId_key" ON "baker"."ingredient_vendors"("ingredientId", "vendorId");

-- CreateIndex
CREATE INDEX "vendor_contacts_vendorId_idx" ON "baker"."vendor_contacts"("vendorId");

-- CreateIndex
CREATE INDEX "equipment_bakeryId_idx" ON "baker"."equipment"("bakeryId");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "baker"."equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_vendorId_idx" ON "baker"."equipment"("vendorId");

-- CreateIndex
CREATE INDEX "production_sheets_bakeryId_idx" ON "baker"."production_sheets"("bakeryId");

-- CreateIndex
CREATE INDEX "production_sheets_completed_idx" ON "baker"."production_sheets"("completed");

-- CreateIndex
CREATE INDEX "production_sheets_scheduledFor_idx" ON "baker"."production_sheets"("scheduledFor");

-- CreateIndex
CREATE INDEX "production_sheets_createdAt_idx" ON "baker"."production_sheets"("createdAt");

-- CreateIndex
CREATE INDEX "production_sheet_recipes_productionSheetId_idx" ON "baker"."production_sheet_recipes"("productionSheetId");

-- CreateIndex
CREATE INDEX "production_sheet_recipes_recipeId_idx" ON "baker"."production_sheet_recipes"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "production_sheet_recipes_productionSheetId_recipeId_key" ON "baker"."production_sheet_recipes"("productionSheetId", "recipeId");

-- CreateIndex
CREATE INDEX "unit_conversions_category_idx" ON "baker"."unit_conversions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "unit_conversions_fromUnit_toUnit_key" ON "baker"."unit_conversions"("fromUnit", "toUnit");

-- CreateIndex
CREATE INDEX "activity_logs_bakeryId_idx" ON "baker"."activity_logs"("bakeryId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "baker"."activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "baker"."activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_idx" ON "baker"."activity_logs"("entityType");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "baker"."activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "tag_types_bakeryId_idx" ON "baker"."tag_types"("bakeryId");

-- CreateIndex
CREATE UNIQUE INDEX "tag_types_bakeryId_name_key" ON "baker"."tag_types"("bakeryId", "name");

-- CreateIndex
CREATE INDEX "tags_bakeryId_idx" ON "baker"."tags"("bakeryId");

-- CreateIndex
CREATE INDEX "tags_tagTypeId_idx" ON "baker"."tags"("tagTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_bakeryId_tagTypeId_name_key" ON "baker"."tags"("bakeryId", "tagTypeId", "name");

-- CreateIndex
CREATE INDEX "entity_tags_tagId_idx" ON "baker"."entity_tags"("tagId");

-- CreateIndex
CREATE INDEX "entity_tags_entityType_entityId_idx" ON "baker"."entity_tags"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_tags_tagId_entityType_entityId_key" ON "baker"."entity_tags"("tagId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "baker"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "baker"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."user_bakeries" ADD CONSTRAINT "user_bakeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "baker"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."user_bakeries" ADD CONSTRAINT "user_bakeries_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."invitations" ADD CONSTRAINT "invitations_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."invitations" ADD CONSTRAINT "invitations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "baker"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."invitations" ADD CONSTRAINT "invitations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "baker"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."recipes" ADD CONSTRAINT "recipes_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."recipe_sections" ADD CONSTRAINT "recipe_sections_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "baker"."recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."recipe_section_ingredients" ADD CONSTRAINT "recipe_section_ingredients_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "baker"."recipe_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."recipe_section_ingredients" ADD CONSTRAINT "recipe_section_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "baker"."ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."ingredients" ADD CONSTRAINT "ingredients_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventories" ADD CONSTRAINT "inventories_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventories" ADD CONSTRAINT "inventories_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "baker"."ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventory_lots" ADD CONSTRAINT "inventory_lots_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "baker"."inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventory_lots" ADD CONSTRAINT "inventory_lots_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "baker"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventory_usages" ADD CONSTRAINT "inventory_usages_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "baker"."inventory_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventory_usages" ADD CONSTRAINT "inventory_usages_productionSheetId_fkey" FOREIGN KEY ("productionSheetId") REFERENCES "baker"."production_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."inventory_usages" ADD CONSTRAINT "inventory_usages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "baker"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."vendors" ADD CONSTRAINT "vendors_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."ingredient_vendors" ADD CONSTRAINT "ingredient_vendors_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "baker"."ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."ingredient_vendors" ADD CONSTRAINT "ingredient_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "baker"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "baker"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."equipment" ADD CONSTRAINT "equipment_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."equipment" ADD CONSTRAINT "equipment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "baker"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."production_sheets" ADD CONSTRAINT "production_sheets_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."production_sheets" ADD CONSTRAINT "production_sheets_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "baker"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."production_sheet_recipes" ADD CONSTRAINT "production_sheet_recipes_productionSheetId_fkey" FOREIGN KEY ("productionSheetId") REFERENCES "baker"."production_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."production_sheet_recipes" ADD CONSTRAINT "production_sheet_recipes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "baker"."recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."activity_logs" ADD CONSTRAINT "activity_logs_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "baker"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."tag_types" ADD CONSTRAINT "tag_types_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."tags" ADD CONSTRAINT "tags_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "baker"."bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."tags" ADD CONSTRAINT "tags_tagTypeId_fkey" FOREIGN KEY ("tagTypeId") REFERENCES "baker"."tag_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baker"."entity_tags" ADD CONSTRAINT "entity_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "baker"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
