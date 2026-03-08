import type { ZodType } from 'zod';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
} from '@/lib/validations/equipment';
import {
  createIngredientSchema,
  updateIngredientSchema,
} from '@/lib/validations/ingredient';
import {
  createRecipeSchema,
  updateRecipeSchema,
} from '@/lib/validations/recipe';
import {
  createVendorSchema,
  updateVendorSchema,
} from '@/lib/validations/vendor';
import {
  createProductionSheetSchema,
  updateProductionSheetSchema,
} from '@/lib/validations/productionSheet';
import { createTagSchema, updateTagSchema } from '@/lib/validations/tag';
import {
  createTagTypeSchema,
  updateTagTypeSchema,
} from '@/lib/validations/tag';
import {
  createBakerySchema,
  updateBakerySchema,
} from '@/lib/validations/bakery';
import {
  createUnitConversionSchema,
  updateUnitConversionSchema,
} from '@/lib/validations/unitConversion';

export interface RouteRegistryEntry {
  /** URL path segment (e.g., 'equipment', 'recipes') */
  path: string;
  /** Display name for OpenAPI tags */
  name: string;
  /** Whether it has POST/PUT/DELETE (readOnly = no mutations) */
  readOnly?: boolean;
  /** Whether it requires platform admin */
  adminOnly?: boolean;
  /** Zod create schema (for request body docs) */
  createSchema?: ZodType;
  /** Zod update schema (for request body docs) */
  updateSchema?: ZodType;
  /** Allowed include relations */
  allowedIncludes?: string[];
  /** Searchable fields */
  searchFields?: string[];
}

export const routeRegistry: RouteRegistryEntry[] = [
  {
    path: 'equipment',
    name: 'Equipment',
    createSchema: createEquipmentSchema,
    updateSchema: updateEquipmentSchema,
    allowedIncludes: ['vendor'],
    searchFields: ['name'],
  },
  {
    path: 'ingredients',
    name: 'Ingredients',
    createSchema: createIngredientSchema,
    updateSchema: updateIngredientSchema,
    allowedIncludes: ['vendor', 'inventory'],
    searchFields: ['name'],
  },
  {
    path: 'inventory',
    name: 'Inventory',
    allowedIncludes: ['lots', 'ingredient'],
    searchFields: [],
  },
  {
    path: 'recipes',
    name: 'Recipes',
    createSchema: createRecipeSchema,
    updateSchema: updateRecipeSchema,
    allowedIncludes: ['sections', 'sections.ingredients', 'productionSheetRecipes'],
    searchFields: ['name'],
  },
  {
    path: 'vendors',
    name: 'Vendors',
    createSchema: createVendorSchema,
    updateSchema: updateVendorSchema,
    allowedIncludes: ['contacts', 'ingredients'],
    searchFields: ['name', 'contactName'],
  },
  {
    path: 'production-sheets',
    name: 'Production Sheets',
    createSchema: createProductionSheetSchema,
    updateSchema: updateProductionSheetSchema,
    allowedIncludes: ['recipes'],
    searchFields: ['name'],
  },
  {
    path: 'tags',
    name: 'Tags',
    createSchema: createTagSchema,
    updateSchema: updateTagSchema,
    allowedIncludes: ['tagType'],
    searchFields: ['name'],
  },
  {
    path: 'tag-types',
    name: 'Tag Types',
    createSchema: createTagTypeSchema,
    updateSchema: updateTagTypeSchema,
    searchFields: ['name'],
  },
  {
    path: 'roles',
    name: 'Roles',
    searchFields: ['name'],
  },
  {
    path: 'invitations',
    name: 'Invitations',
    searchFields: ['email'],
  },
  {
    path: 'activity-logs',
    name: 'Activity Logs',
    readOnly: true,
    searchFields: ['action'],
  },
  {
    path: 'users',
    name: 'Users',
    adminOnly: true,
    searchFields: ['email', 'name'],
  },
  {
    path: 'bakeries',
    name: 'Bakeries',
    adminOnly: true,
    createSchema: createBakerySchema,
    updateSchema: updateBakerySchema,
    searchFields: ['name'],
  },
  {
    path: 'unit-conversions',
    name: 'Unit Conversions',
    createSchema: createUnitConversionSchema,
    updateSchema: updateUnitConversionSchema,
    searchFields: [],
  },
];
