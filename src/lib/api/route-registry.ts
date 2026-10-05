import type { ZodType } from 'zod';
import type { CrudRouteConfig } from './create-crud-routes';
import { bakeryRoutes } from './resources/bakeries';
import { equipmentRoutes } from './resources/equipment';
import { ingredientRoutes } from './resources/ingredients';
import { inventoryRoutes } from './resources/inventory';
import { addInventoryLotSchema, updateInventoryLotSchema } from '@/lib/validations/inventory';
import { invitationRoutes } from './resources/invitations';
import { productionSheetRoutes } from './resources/productionSheets';
import { productRoutes } from './resources/products';
import { recipeRoutes } from './resources/recipes';
import { roleRoutes } from './resources/roles';
import { supplyRoutes } from './resources/supplies';
import { tagTypeRoutes } from './resources/tagTypes';
import { tagRoutes } from './resources/tags';
import { unitConversionRoutes } from './resources/unitConversions';
import { userRoutes } from './resources/users';
import { vendorRoutes } from './resources/vendors';
import { addRecipeToSheetSchema, updateRecipeOnSheetSchema } from '@/lib/validations/productionSheet';
import { assignIngredientVendorSchema } from '@/lib/validations/ingredient';
import { assignTagSchema } from '@/lib/validations/tag';

/** CRUD operations a resource exposes. */
export type CrudMethod = 'list' | 'create' | 'get' | 'update' | 'delete';

/** An endpoint beyond plain CRUD, e.g. POST /products/{id}/recalculate. */
export interface ActionEndpoint {
  method: 'get' | 'post' | 'put' | 'delete';
  /** Path relative to /api/v1, with {param} placeholders. */
  path: string;
  summary: string;
  description?: string;
  body?: ZodType;
}

export interface RouteRegistryEntry {
  /** URL path segment (e.g., 'equipment', 'recipes') */
  path: string;
  /** Display name for OpenAPI tags */
  name: string;
  /** Which CRUD operations exist (default: all, or list/get when readOnly) */
  methods?: CrudMethod[];
  /** Whether it has POST/PUT/DELETE (readOnly = no mutations) */
  readOnly?: boolean;
  /** Whether it requires platform admin */
  adminOnly?: boolean;
  /** Extra notes for the resource's OpenAPI tag */
  note?: string;
  /** Zod create schema (for request body docs) */
  createSchema?: ZodType;
  /** Zod update schema (for request body docs) */
  updateSchema?: ZodType;
  /** Allowed include relations */
  allowedIncludes?: string[];
  /** Searchable fields */
  searchFields?: string[];
  /** Endpoints beyond CRUD */
  actions?: ActionEndpoint[];
}

/**
 * Build an entry from the route's own config so the docs can't drift from
 * what the route accepts.
 */
function fromRoutes(
  path: string,
  name: string,
  routes: { config: CrudRouteConfig },
  extra: Partial<RouteRegistryEntry> = {}
): RouteRegistryEntry {
  const { config } = routes;
  return {
    path,
    name,
    readOnly: config.readOnly,
    adminOnly: config.adminOnly,
    createSchema: config.validators?.create,
    updateSchema: config.validators?.update,
    allowedIncludes: config.allowedIncludes,
    searchFields: config.searchFields,
    ...extra,
  };
}

export const routeRegistry: RouteRegistryEntry[] = [
  fromRoutes('recipes', 'Recipes', recipeRoutes),
  fromRoutes('products', 'Products', productRoutes, {
    actions: [
      {
        method: 'post',
        path: '/products/{id}/recalculate',
        summary: 'Recalculate product variation costs',
        description: 'Reprices every variation against the current recipe and supply costs.',
      },
    ],
  }),
  fromRoutes('production-sheets', 'Production Sheets', productionSheetRoutes, {
    actions: [
      {
        method: 'post',
        path: '/production-sheets/{id}/recipes',
        summary: 'Add a recipe to a production sheet',
        body: addRecipeToSheetSchema,
      },
      {
        method: 'put',
        path: '/production-sheets/{id}/recipes/{recipeId}',
        summary: 'Update a recipe on a production sheet',
        body: updateRecipeOnSheetSchema,
      },
      {
        method: 'delete',
        path: '/production-sheets/{id}/recipes/{recipeId}',
        summary: 'Remove a recipe from a production sheet',
      },
    ],
  }),
  fromRoutes('ingredients', 'Ingredients', ingredientRoutes, {
    actions: [
      {
        method: 'post',
        path: '/ingredients/{id}/vendors',
        summary: 'Link a vendor to an ingredient',
        body: assignIngredientVendorSchema,
      },
      {
        method: 'delete',
        path: '/ingredients/{id}/vendors/{vendorId}',
        summary: 'Unlink a vendor from an ingredient',
      },
    ],
  }),
  fromRoutes('inventory', 'Inventory', inventoryRoutes, {
    methods: ['list', 'get', 'update'],
    note: 'Inventory rows are created with an ingredient\'s first lot; only settings are editable.',
  }),
  // Hand-written routes: lots are scoped through their inventory row.
  {
    path: 'inventory-lots',
    name: 'Inventory Lots',
    createSchema: addInventoryLotSchema,
    updateSchema: updateInventoryLotSchema,
  },
  fromRoutes('supplies', 'Supplies', supplyRoutes),
  fromRoutes('vendors', 'Vendors', vendorRoutes),
  fromRoutes('equipment', 'Equipment', equipmentRoutes),
  fromRoutes('tag-types', 'Tag Types', tagTypeRoutes),
  fromRoutes('tags', 'Tags', tagRoutes, {
    actions: [
      {
        method: 'get',
        path: '/tags/{id}/assignments',
        summary: 'List what a tag is assigned to',
      },
      {
        method: 'post',
        path: '/tags/{id}/assignments',
        summary: 'Assign a tag to an ingredient, recipe or vendor',
        body: assignTagSchema,
      },
      {
        method: 'delete',
        path: '/tags/{id}/assignments/{entityType}/{entityId}',
        summary: 'Remove a tag assignment',
      },
      {
        method: 'get',
        path: '/entity-tags/{entityType}/{entityId}',
        summary: 'List the tags on an ingredient, recipe or vendor',
      },
    ],
  }),
  fromRoutes('unit-conversions', 'Unit Conversions', unitConversionRoutes, {
    note: 'Readable by any caller; writes require platform admin.',
  }),
  fromRoutes('roles', 'Roles', roleRoutes),
  fromRoutes('bakeries', 'Bakeries', bakeryRoutes),
  fromRoutes('users', 'Users', userRoutes, {
    methods: ['list', 'get', 'update', 'delete'],
    note: 'Users are created by signing up.',
    actions: [
      {
        method: 'post',
        path: '/users/{id}/bakeries/{bakeryId}',
        summary: 'Add a user to a bakery',
      },
      {
        method: 'delete',
        path: '/users/{id}/bakeries/{bakeryId}',
        summary: 'Remove a user from a bakery',
      },
    ],
  }),
  fromRoutes('invitations', 'Invitations', invitationRoutes, {
    methods: ['list', 'create', 'get', 'delete'],
    note: 'Creating an invitation needs a signed-in user; API keys cannot yet.',
    actions: [
      { method: 'post', path: '/invitations/{id}/revoke', summary: 'Revoke an invitation' },
      { method: 'post', path: '/invitations/{id}/resend', summary: 'Resend an invitation email' },
    ],
  }),
  {
    path: 'activity-logs',
    name: 'Activity Logs',
    readOnly: true,
    searchFields: ['action'],
  },
];
