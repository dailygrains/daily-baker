#!/bin/bash
# Vercel deployment script for Daily Baker
# Handles Prisma migrations for fresh deployment to shared PostgreSQL database

set -e

echo "Starting Daily Baker deployment..."

# For fresh deployments to the shared Prisma Postgres database, we need special handling.
# Old migrations created tables in 'public' schema, but we now use 'baker' schema.
# We must mark old migrations as already applied, then apply only the baker schema migration.

# List of migrations before the baker schema migration (these created tables in public)
OLD_MIGRATIONS=(
  "20251119070826_init"
  "20251129152124_convert_user_bakery_to_many_to_many"
  "20251129171831_remove_bakery_id_from_roles"
  "20251129215624_add_user_image_url"
  "20251130000419_add_ingredient_vendor_many_to_many"
  "20260125203831_inventory_fifo_system"
  "20260125211006_rename_bake_sheet_to_production_sheet"
  "20260202002527_add_low_stock_threshold"
  "20260202010000_split_recipe_yield_fields"
  "20260202020000_multi_recipe_production_sheets"
  "20260202070553_add_production_sheet_snapshot"
  "20260208190512_add_preparation_to_recipe_ingredients"
  "20260208215037_add_tagging_system"
  "20260208221646_add_tag_description"
  "20260209042622_add_bakers_math_to_recipe_section"
  "20260210000000_multi_base_bakers_math"
  "20260210010000_add_ingredient_order"
)

echo "Marking old migrations as applied (baseline for fresh deployment)..."

# Mark each old migration as already applied
for migration in "${OLD_MIGRATIONS[@]}"; do
  echo "Resolving migration: $migration"
  npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
done

echo "Applying baker schema migration..."

# Now run migrate deploy - this will only apply the baker schema migration
npx prisma migrate deploy

echo "Migrations complete!"

# Build the application (prisma generate runs as part of postinstall)
npm run build

echo "Deployment complete!"
