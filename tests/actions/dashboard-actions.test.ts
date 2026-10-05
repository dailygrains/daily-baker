// Payloads are built exactly as the UI components build them, so they are
// loosely typed on purpose; results are inspected structurally.
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Dashboard path tests: call the real server actions with the payloads the
 * dashboard components send, against the local Docker Postgres.
 *
 * Mocked:
 *  - @/lib/clerk: Clerk cannot run here. getCurrentUser() returns the same
 *    shape the real one builds (user row + bakeries + role, plus bakery,
 *    bakeryId and allBakeries) for real User rows created below.
 *  - next/cache: revalidatePath/revalidateTag need a Next request scope.
 *  - @/lib/ses: invitation emails.
 *  - @/lib/snapshot/s3: recipe and production sheet saves upload snapshots
 *    to S3, and .env holds real AWS credentials and bucket. The serializers
 *    still run; only the upload is replaced.
 */

const auth = vi.hoisted(() => ({ user: null as any }));
const uploads = vi.hoisted(() => [] as any[]);
const emails = vi.hoisted(() => [] as any[]);

vi.mock('@/lib/clerk', () => ({
  getCurrentUser: vi.fn(async () => auth.user),
  isPlatformAdmin: vi.fn(async () => Boolean(auth.user?.isPlatformAdmin)),
  requireAuth: vi.fn(async () => {
    if (!auth.user) throw new Error('Unauthorized');
    return auth.user;
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock('@/lib/ses', () => ({
  sendUserInvitation: vi.fn(async (params: unknown) => {
    emails.push(params);
  }),
  sendEmail: vi.fn(),
  sendHtmlEmail: vi.fn(),
  verifyEmailAddress: vi.fn(),
  sendLowStockAlert: vi.fn(),
  sendProductionSheetCompleted: vi.fn(),
  sendPlatformAdminAlert: vi.fn(),
}));

vi.mock('@/lib/snapshot/s3', () => ({
  generateSnapshotKey: vi.fn(() => 'snapshots/test.json'),
  parseSnapshotKey: vi.fn(),
  uploadSnapshot: vi.fn(async (snapshot: any) => {
    uploads.push(snapshot);
    return `snapshots/test/${snapshot.metadata.id}.json`;
  }),
  getSnapshot: vi.fn(async () => null),
  listSnapshots: vi.fn(async () => []),
  getLatestSnapshot: vi.fn(async () => null),
  getSnapshotMetadata: vi.fn(async () => null),
}));

import { db } from '@/lib/db';
import { createRecipe, updateRecipe, deleteRecipe, getRecipeById } from '@/app/actions/recipe';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  recalculateProductCost,
  getProductById,
} from '@/app/actions/product';
import {
  createProductionSheet,
  updateProductionSheet,
  addRecipeToSheet,
  updateRecipeOnSheet,
  removeRecipeFromSheet,
  deleteProductionSheet,
  completeProductionSheet,
} from '@/app/actions/productionSheet';
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  assignVendorToIngredient,
  unassignVendorFromIngredient,
} from '@/app/actions/ingredient';
import { addInventoryLot, updateInventoryLot, deleteInventoryLot } from '@/app/actions/inventory';
import { createSupply, updateSupply, deleteSupply } from '@/app/actions/supply';
import { createVendor, updateVendor, deleteVendor } from '@/app/actions/vendor';
import { createEquipment, updateEquipment, deleteEquipment } from '@/app/actions/equipment';
import {
  createTagType,
  updateTagType,
  deleteTagType,
  createTag,
  updateTag,
  deleteTag,
  assignTagToEntity,
  unassignTagFromEntity,
} from '@/app/actions/tag';
import {
  createUnitConversion,
  updateUnitConversion,
  deleteUnitConversion,
} from '@/app/actions/unitConversion';
import { createRole, updateRole, deleteRole } from '@/app/actions/role';
import {
  createBakery,
  updateBakery,
  deleteBakery,
  assignUserToBakery,
  unassignUserFromBakery,
} from '@/app/actions/bakery';
import { assignUserRole, deleteUser } from '@/app/actions/user';
import { createInvitation, revokeInvitation, deleteInvitation } from '@/app/actions/invitation';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run action tests against non-local database host "${host}"`);
  }
}
assertLocalDatabase();

const run = crypto.randomBytes(4).toString('hex');
const tag = (label: string) => `${label} ${run}`;
const MISSING_ID = 'cnotarealid0000000000000000';
/** An input left empty: forms send `field || null` (or `|| undefined`). */
const EMPTY_FIELD: string = '';

const ids = {
  bakery: '',
  otherBakery: '',
  baker: '',
  admin: '',
  target: '',
  otherIngredient: '',
  otherRecipe: '',
  otherVendor: '',
  createdBakeries: [] as string[],
  createdRoles: [] as string[],
  conversionUnits: [] as string[],
};

/** Mirror of the object getCurrentUser() returns for a signed-in user. */
async function sessionFor(userId: string, selectedBakeryId?: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { bakeries: { include: { bakery: true } }, role: true },
  });
  let bakery: any = user.bakeries[0]?.bakery;
  if (selectedBakeryId) {
    bakery = user.isPlatformAdmin
      ? await db.bakery.findUnique({ where: { id: selectedBakeryId, isActive: true } })
      : user.bakeries.find((ub) => ub.bakeryId === selectedBakeryId)?.bakery;
  }
  const allBakeries = user.isPlatformAdmin
    ? await db.bakery.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : user.bakeries.map((ub) => ({ id: ub.bakery.id, name: ub.bakery.name }));
  return { ...user, bakery, bakeryId: bakery?.id as string | undefined, allBakeries };
}

const signInAsBaker = async () => {
  auth.user = await sessionFor(ids.baker);
};
const signInAsAdmin = async () => {
  auth.user = await sessionFor(ids.admin, ids.bakery);
};

/** Assert a success envelope, surfacing the action's error if it failed. */
function ok<T = any>(result: { success: boolean; error?: string; data?: T }): T {
  if (!result.success) throw new Error(`Expected success, got error: ${result.error}`);
  expect(result.success).toBe(true);
  return result.data as T;
}

/** Assert a readable failure envelope (not a throw, not a generic fallback). */
function failed(result: { success: boolean; error?: string }, message: string | RegExp) {
  expect(result.success).toBe(false);
  expect(typeof result.error).toBe('string');
  if (typeof message === 'string') expect(result.error).toContain(message);
  else expect(result.error).toMatch(message);
}

beforeAll(async () => {
  const [bakery, other] = await Promise.all([
    db.bakery.create({ data: { name: tag('Action Test'), slug: `action-test-${run}` } }),
    db.bakery.create({ data: { name: tag('Action Test Other'), slug: `action-test-other-${run}` } }),
  ]);
  ids.bakery = bakery.id;
  ids.otherBakery = other.id;

  const [baker, admin, target] = await Promise.all([
    db.user.create({ data: { clerkId: `test_${run}_baker`, email: `baker-${run}@example.test`, name: 'Test Baker' } }),
    db.user.create({
      data: { clerkId: `test_${run}_admin`, email: `admin-${run}@example.test`, name: 'Test Admin', isPlatformAdmin: true },
    }),
    db.user.create({ data: { clerkId: `test_${run}_target`, email: `target-${run}@example.test`, name: 'Target User' } }),
  ]);
  ids.baker = baker.id;
  ids.admin = admin.id;
  ids.target = target.id;
  await db.userBakery.create({ data: { userId: baker.id, bakeryId: bakery.id } });

  // Another tenant's records, for cross-bakery rejection checks.
  const otherIngredient = await db.ingredient.create({ data: { bakeryId: other.id, name: 'Other flour', unit: 'g' } });
  const otherRecipe = await db.recipe.create({
    data: {
      bakeryId: other.id,
      name: 'Other loaf',
      yieldQty: 1,
      yieldUnit: 'loaf',
      sections: {
        create: [{ name: 'Dough', order: 0, instructions: '', ingredients: { create: [{ ingredientId: otherIngredient.id, quantity: 100, unit: 'g' }] } }],
      },
    },
  });
  const otherVendor = await db.vendor.create({ data: { bakeryId: other.id, name: 'Other mill' } });
  ids.otherIngredient = otherIngredient.id;
  ids.otherRecipe = otherRecipe.id;
  ids.otherVendor = otherVendor.id;
});

afterAll(async () => {
  const userIds = [ids.baker, ids.admin, ids.target].filter(Boolean);
  const bakeryIds = { in: [ids.bakery, ids.otherBakery, ...ids.createdBakeries].filter(Boolean) };
  await db.invitation.deleteMany({ where: { createdBy: { in: userIds } } });
  if (ids.conversionUnits.length > 0) {
    await db.unitConversion.deleteMany({ where: { fromUnit: { in: ids.conversionUnits } } });
  }
  await db.$transaction([
    db.inventoryUsage.deleteMany({ where: { createdBy: { in: userIds } } }),
    db.productionSheet.deleteMany({ where: { bakeryId: bakeryIds } }),
    db.product.deleteMany({ where: { bakeryId: bakeryIds } }),
    db.recipe.deleteMany({ where: { bakeryId: bakeryIds } }),
    db.bakery.deleteMany({ where: { id: bakeryIds } }),
  ]);
  if (ids.createdRoles.length > 0) {
    await db.role.deleteMany({ where: { id: { in: ids.createdRoles } } });
  }
  await db.user.deleteMany({ where: { id: { in: userIds } } });
});

beforeEach(async () => {
  await signInAsBaker();
});

// Records shared across describe blocks (the file runs sequentially).
const shared = {
  vendorId: '',
  vendor2Id: '',
  flourId: '',
  waterId: '',
  saltId: '',
  lotId: '',
  recipeId: '',
  recipe2Id: '',
  recipe3Id: '',
  supplyId: '',
  productId: '',
  sheetId: '',
};

// ---------------------------------------------------------------------------
// Auth envelope
// ---------------------------------------------------------------------------

describe('auth envelope', () => {
  it('returns the unauthorized envelope instead of throwing when signed out', async () => {
    auth.user = null;
    const result = await createVendor({ bakeryId: ids.bakery, name: 'x' } as any);
    expect(result).toEqual({ success: false, error: 'Unauthorized: You must be logged in' });
  });
});

// ---------------------------------------------------------------------------
// Vendors (VendorForm, IngredientForm quick-create, VendorEditPageContent)
// ---------------------------------------------------------------------------

describe('vendors', () => {
  it('creates a vendor with the VendorForm payload (empty fields become null)', async () => {
    const formData = { name: tag('Mill'), email: '', phone: '', website: '', notes: '' };
    const vendor = ok(
      await createVendor({
        bakeryId: auth.user.bakeryId,
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        website: formData.website || null,
        notes: formData.notes || null,
      })
    );
    expect(vendor.id).toBeTruthy();
    const row = await db.vendor.findUniqueOrThrow({ where: { id: vendor.id } });
    expect(row).toMatchObject({ bakeryId: ids.bakery, name: formData.name, email: null, website: null });
    shared.vendorId = vendor.id;
  });

  it('creates a vendor from the IngredientForm quick-create ({ bakeryId, name })', async () => {
    const result = await createVendor({ bakeryId: auth.user.bakeryId, name: tag('Dairy') });
    const vendor = ok(result);
    // IngredientForm reads result.data.id and result.data.name
    expect(vendor.id).toBeTruthy();
    expect(vendor.name).toBe(tag('Dairy'));
    shared.vendor2Id = vendor.id;
  });

  it('updates a vendor with the VendorForm edit payload', async () => {
    const existing = await db.vendor.findUniqueOrThrow({ where: { id: shared.vendorId } });
    const formData = {
      name: existing.name + ' Co',
      email: 'orders@mill.example',
      phone: '555-0100',
      website: 'https://mill.example',
      notes: '',
    };
    const vendor = ok(
      await updateVendor({
        id: existing.id,
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        website: formData.website || null,
        notes: formData.notes || null,
      })
    );
    expect(vendor.id).toBe(existing.id);
    const row = await db.vendor.findUniqueOrThrow({ where: { id: existing.id } });
    expect(row).toMatchObject({ name: formData.name, email: formData.email, phone: '555-0100', notes: null });
  });

  it('rejects an invalid website with a readable message', async () => {
    failed(
      await updateVendor({ id: shared.vendorId, name: 'x', email: null, phone: null, website: 'mill.example', notes: null }),
      'Invalid website URL'
    );
  });

  it('rejects creating a vendor for another bakery', async () => {
    failed(await createVendor({ bakeryId: ids.otherBakery, name: 'nope' }), 'only create vendors for your bakery');
  });

  it('deletes an unused vendor', async () => {
    const vendor = ok(await createVendor({ bakeryId: auth.user.bakeryId, name: tag('Temp vendor') }));
    ok(await deleteVendor(vendor.id));
    expect(await db.vendor.findUnique({ where: { id: vendor.id } })).toBeNull();
  });

  it('returns not found for another bakery\'s vendor', async () => {
    failed(await deleteVendor(ids.otherVendor), 'Vendor not found');
  });
});

// ---------------------------------------------------------------------------
// Ingredients (IngredientForm, RecipeForm quick-create, IngredientEditPageContent)
// ---------------------------------------------------------------------------

describe('ingredients', () => {
  it('creates an ingredient with the IngredientForm payload', async () => {
    const formData = {
      name: tag('Bread flour'),
      currentQty: 0,
      unit: 'g',
      costPerUnit: 0,
      lowStockThreshold: null as number | null,
      densityGramsPerMl: null as number | null,
    };
    const ingredient = ok(await createIngredient({ bakeryId: auth.user.bakeryId, ...formData } as any));
    expect(ingredient).toMatchObject({ name: formData.name, unit: 'g', currentQty: 0, costPerUnit: 0 });
    shared.flourId = ingredient.id;
  });

  it('creates an ingredient from the RecipeForm quick-create ({ bakeryId, name, unit })', async () => {
    const result = await createIngredient({ bakeryId: auth.user.bakeryId, name: tag('Water'), unit: 'g' });
    const ingredient = ok(result);
    // RecipeForm reads result.data.id, .name, .unit
    expect(ingredient.id).toBeTruthy();
    expect(ingredient.name).toBe(tag('Water'));
    expect(ingredient.unit).toBe('g');
    shared.waterId = ingredient.id;

    const salt = ok(await createIngredient({ bakeryId: auth.user.bakeryId, name: tag('Salt'), unit: 'g' }));
    shared.saltId = salt.id;
  });

  it('updates with a low stock threshold and density, creating the Inventory row', async () => {
    const formData = {
      name: tag('Bread flour'),
      currentQty: 0,
      unit: 'g',
      costPerUnit: 0,
      lowStockThreshold: 500 as number | null,
      densityGramsPerMl: 0.593,
    };
    const ingredient = ok(await updateIngredient({ id: shared.flourId, ...formData } as any));
    expect(typeof ingredient.currentQty).toBe('number');
    expect(typeof ingredient.costPerUnit).toBe('number');

    const inventory = await db.inventory.findUniqueOrThrow({ where: { ingredientId: shared.flourId } });
    expect(Number(inventory.lowStockThreshold)).toBe(500);
    const row = await db.ingredient.findUniqueOrThrow({ where: { id: shared.flourId } });
    expect(Number(row.densityGramsPerMl)).toBeCloseTo(0.593);
  });

  it('clears the low stock threshold when the field is emptied (null)', async () => {
    ok(
      await updateIngredient({
        id: shared.flourId,
        name: tag('Bread flour'),
        currentQty: 0,
        unit: 'g',
        costPerUnit: 0,
        lowStockThreshold: null,
        densityGramsPerMl: 0.593,
      } as any)
    );
    const inventory = await db.inventory.findUniqueOrThrow({ where: { ingredientId: shared.flourId } });
    expect(inventory.lowStockThreshold).toBeNull();
  });

  it('assigns and unassigns a vendor', async () => {
    ok(await assignVendorToIngredient(shared.flourId, shared.vendorId));
    expect(
      await db.ingredientVendor.count({ where: { ingredientId: shared.flourId, vendorId: shared.vendorId } })
    ).toBe(1);

    failed(await assignVendorToIngredient(shared.flourId, shared.vendorId), 'already assigned');

    // Vendor with a linked ingredient cannot be deleted.
    failed(await deleteVendor(shared.vendorId), 'Please unlink them first');

    ok(await unassignVendorFromIngredient(shared.flourId, shared.vendorId));
    expect(await db.ingredientVendor.count({ where: { ingredientId: shared.flourId } })).toBe(0);

    failed(await unassignVendorFromIngredient(shared.flourId, shared.vendorId), 'Vendor assignment not found');
    // Re-link for later checks.
    ok(await assignVendorToIngredient(shared.flourId, shared.vendorId));
  });

  it('rejects assigning another bakery\'s vendor', async () => {
    failed(await assignVendorToIngredient(shared.flourId, ids.otherVendor), 'Vendor not found or belongs to another bakery');
  });

  it('rejects an empty name with a readable validation message', async () => {
    failed(await createIngredient({ bakeryId: auth.user.bakeryId, name: '', unit: 'g' }), 'Ingredient name is required');
  });

  it('deletes an unused ingredient', async () => {
    const ingredient = ok(await createIngredient({ bakeryId: auth.user.bakeryId, name: tag('Temp'), unit: 'g' }));
    ok(await deleteIngredient(ingredient.id));
    expect(await db.ingredient.findUnique({ where: { id: ingredient.id } })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Inventory lots (AddLotForm, EditLotForm, EditLotPageContent)
// ---------------------------------------------------------------------------

describe('inventory lots', () => {
  it('adds a lot with the AddLotForm payload', async () => {
    const formData = {
      ingredientId: shared.flourId,
      quantity: '5',
      unit: 'kg',
      totalCost: '12.50',
      expiresAt: '2026-12-31',
      vendorId: shared.vendorId,
      notes: '',
    };
    const lot = ok(
      await addInventoryLot({
        ingredientId: formData.ingredientId,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        totalCost: parseFloat(formData.totalCost),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
        vendorId: formData.vendorId || null,
        notes: formData.notes || null,
      })
    );
    expect(lot).toMatchObject({ purchaseQty: 5, remainingQty: 5, costPerUnit: 2.5, purchaseUnit: 'kg' });
    shared.lotId = lot.id;

    const row = await db.inventoryLot.findUniqueOrThrow({ where: { id: lot.id }, include: { inventory: true } });
    expect(row.inventory.ingredientId).toBe(shared.flourId);
    expect(row.vendorId).toBe(shared.vendorId);
    expect(row.notes).toBeNull();
    expect(row.expiresAt?.toISOString().slice(0, 10)).toBe('2026-12-31');
  });

  it('adds a lot with no vendor and no expiry', async () => {
    const lot = ok(
      await addInventoryLot({
        ingredientId: shared.saltId,
        quantity: parseFloat('1'),
        unit: 'kg',
        totalCost: parseFloat('3'),
        expiresAt: null,
        vendorId: null,
        notes: null,
      })
    );
    expect(lot.vendorId).toBeNull();
  });

  it('updates lot metadata with the EditLotForm payload, clearing expiry and vendor', async () => {
    const formData = { expiresAt: '', vendorId: '', notes: 'Opened bag' };
    const lot = ok(
      await updateInventoryLot({
        id: shared.lotId,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
        vendorId: formData.vendorId || null,
        notes: formData.notes || null,
      })
    );
    expect(lot.id).toBe(shared.lotId);
    const row = await db.inventoryLot.findUniqueOrThrow({ where: { id: shared.lotId } });
    expect(row).toMatchObject({ expiresAt: null, vendorId: null, notes: 'Opened bag' });
    expect(Number(row.remainingQty)).toBe(5);
  });

  it('rejects another bakery\'s vendor on a lot', async () => {
    failed(
      await updateInventoryLot({ id: shared.lotId, expiresAt: null, vendorId: ids.otherVendor, notes: null }),
      'Vendor not found or belongs to another bakery'
    );
  });

  it('refuses to delete an ingredient that has lots', async () => {
    failed(await deleteIngredient(shared.saltId), 'inventory lot(s)');
  });

  it('deletes an unused lot, and refuses a lot with usage history', async () => {
    // A separate ingredient, so water keeps no inventory for the sheet warnings below.
    const yeast = ok(await createIngredient({ bakeryId: auth.user.bakeryId, name: tag('Yeast'), unit: 'g' }));
    const temp = ok(
      await addInventoryLot({ ingredientId: yeast.id, quantity: 10, unit: 'kg', totalCost: 0, expiresAt: null, vendorId: null, notes: null })
    );
    ok(await deleteInventoryLot(temp.id));
    expect(await db.inventoryLot.findUnique({ where: { id: temp.id } })).toBeNull();

    const used = ok(
      await addInventoryLot({ ingredientId: yeast.id, quantity: 10, unit: 'kg', totalCost: 0, expiresAt: null, vendorId: null, notes: null })
    );
    await db.inventoryUsage.create({
      data: { lotId: used.id, quantity: 1, reason: 'USE', createdBy: ids.baker },
    });
    failed(await deleteInventoryLot(used.id), 'usage record(s)');
  });
});

// ---------------------------------------------------------------------------
// Recipes (RecipeForm, RecipeEditPageContent)
// ---------------------------------------------------------------------------

/** RecipeForm's initial `sections` state for an existing recipe. */
function recipeFormSections(recipe: any) {
  return recipe.sections.map((s: any) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    instructions: s.instructions,
    useBakersMath: s.useBakersMath ?? false,
    bakersMathBaseIndices: s.bakersMathBaseIndices ?? [],
    ingredients: s.ingredients.map((ing: any, ingIdx: number) => ({
      id: ing.id,
      ingredientId: ing.ingredientId,
      quantity: Number(ing.quantity),
      unit: ing.unit,
      preparation: ing.preparation ?? null,
      order: ing.order ?? ingIdx,
    })),
  }));
}

describe('recipes', () => {
  const recipeName = tag('Country loaf');

  it('creates a recipe with the RecipeForm payload', async () => {
    uploads.length = 0;
    const formData = { name: recipeName, description: '', yieldQty: '2', yieldUnit: 'loaves' };
    const sections = [
      {
        name: 'Levain',
        order: 0,
        instructions: '',
        useBakersMath: false,
        bakersMathBaseIndices: [],
        ingredients: [
          { ingredientId: shared.flourId, quantity: 100, unit: 'g', preparation: null, order: 0 },
          { ingredientId: shared.waterId, quantity: 100, unit: 'g', order: 1 },
        ],
      },
      {
        name: 'Dough',
        order: 1,
        instructions: '1. Mix\n2. Bulk ferment',
        useBakersMath: true,
        bakersMathBaseIndices: [0],
        ingredients: [
          { ingredientId: shared.flourId, quantity: 900, unit: 'g', preparation: null, order: 0 },
          { ingredientId: shared.waterId, quantity: 650, unit: 'g', preparation: 'warm', order: 1 },
          { ingredientId: shared.saltId, quantity: 20, unit: 'g', preparation: null, order: 2 },
        ],
      },
    ];
    const yieldQty = parseInt(formData.yieldQty) || 1;
    const result = await createRecipe({
      bakeryId: auth.user.bakeryId,
      name: formData.name,
      description: formData.description || null,
      yieldQty,
      yieldUnit: formData.yieldUnit,
      sections,
    });
    ok(result); // useFormSubmit only reads success/error

    const recipe = await db.recipe.findFirstOrThrow({
      where: { bakeryId: ids.bakery, name: recipeName },
      include: { sections: { orderBy: { order: 'asc' }, include: { ingredients: { orderBy: { order: 'asc' } } } } },
    });
    shared.recipeId = recipe.id;
    expect(recipe.description).toBeNull();
    expect(recipe.yieldQty).toBe(2);
    expect(recipe.sections.map((s) => s.name)).toEqual(['Levain', 'Dough']);
    expect(recipe.sections[1].useBakersMath).toBe(true);
    expect(recipe.sections[1].bakersMathBaseIndices).toEqual([0]);
    expect(recipe.sections[1].ingredients[1].preparation).toBe('warm');
    // 1 kg flour at $2.50/kg and 1 kg salt at $3/kg: 1000 g flour + 20 g salt.
    expect(Number(recipe.totalCost)).toBeCloseTo(2.5 + 0.06, 2);

    const activity = await db.activityLog.findFirst({ where: { entityId: recipe.id, action: 'CREATE' } });
    expect(activity).toMatchObject({ userId: ids.baker, bakeryId: ids.bakery });

    expect(uploads.some((u) => u.metadata.entityType === 'recipe' && u.metadata.entityId === recipe.id)).toBe(true);
  });

  it('updates a recipe with the RecipeForm edit payload built from getRecipeById', async () => {
    const loaded = ok(await getRecipeById(shared.recipeId)) as any;
    const sections = recipeFormSections(loaded);
    // Reorder: move Dough above Levain, as the up/down buttons do.
    const reordered = [sections[1], sections[0]].map((s: any, i: number) => ({ ...s, order: i }));
    reordered[0].ingredients.push({ ingredientId: shared.saltId, quantity: 5, unit: 'g', preparation: null, order: 3 });
    const formData = { name: loaded.name + ' v2', description: 'Tangy', yieldQty: String(loaded.yieldQty), yieldUnit: loaded.yieldUnit };

    ok(
      await updateRecipe({
        id: loaded.id,
        name: formData.name,
        description: formData.description || null,
        yieldQty: parseInt(formData.yieldQty) || 1,
        yieldUnit: formData.yieldUnit,
        sections: reordered,
      })
    );

    const recipe = await db.recipe.findUniqueOrThrow({
      where: { id: shared.recipeId },
      include: { sections: { orderBy: { order: 'asc' }, include: { ingredients: true } } },
    });
    expect(recipe.name).toBe(recipeName + ' v2');
    expect(recipe.description).toBe('Tangy');
    expect(recipe.sections.map((s) => s.name)).toEqual(['Dough', 'Levain']);
    expect(recipe.sections[0].ingredients).toHaveLength(4);
  });

  it('creates two more recipes for products and sheets', async () => {
    for (const [key, name] of [['recipe2Id', tag('Baguette')], ['recipe3Id', tag('Focaccia')]] as const) {
      ok(
        await createRecipe({
          bakeryId: auth.user.bakeryId,
          name,
          description: null,
          yieldQty: 1,
          yieldUnit: 'batch',
          sections: [
            {
              name: '',
              order: 0,
              instructions: '',
              useBakersMath: false,
              bakersMathBaseIndices: [],
              ingredients: [{ ingredientId: shared.flourId, quantity: 500, unit: 'g', preparation: null, order: 0 }],
            },
          ],
        })
      );
      shared[key] = (await db.recipe.findFirstOrThrow({ where: { bakeryId: ids.bakery, name } })).id;
    }
  });

  it('rejects an empty name with a readable validation message', async () => {
    failed(
      await createRecipe({
        bakeryId: auth.user.bakeryId,
        name: '',
        description: null,
        yieldQty: 1,
        yieldUnit: 'loaf',
        sections: [{ name: '', order: 0, instructions: '', useBakersMath: false, bakersMathBaseIndices: [], ingredients: [] }],
      }),
      'Recipe name is required'
    );
  });

  it('rejects another bakery\'s ingredient in a section', async () => {
    failed(
      await createRecipe({
        bakeryId: auth.user.bakeryId,
        name: tag('Sneaky'),
        description: null,
        yieldQty: 1,
        yieldUnit: 'loaf',
        sections: [
          {
            name: '',
            order: 0,
            instructions: '',
            useBakersMath: false,
            bakersMathBaseIndices: [],
            ingredients: [{ ingredientId: ids.otherIngredient, quantity: 1, unit: 'g', preparation: null, order: 0 }],
          },
        ],
      }),
      'Ingredient not found or belongs to another bakery'
    );
  });

  it('rejects creating a recipe for another bakery', async () => {
    failed(
      await createRecipe({ bakeryId: ids.otherBakery, name: 'x', description: null, yieldQty: 1, yieldUnit: 'x', sections: [] } as any),
      'only create recipes for your bakery'
    );
  });

  it('refuses to delete an ingredient used in a recipe', async () => {
    failed(await deleteIngredient(shared.waterId), 'Cannot delete ingredient with 2 recipe usage(s)');
  });

  it('returns not found when updating another bakery\'s recipe', async () => {
    failed(await updateRecipe({ id: ids.otherRecipe, name: 'Hijack' }), 'Recipe not found');
    const other = await db.recipe.findUniqueOrThrow({ where: { id: ids.otherRecipe } });
    expect(other.name).toBe('Other loaf');
  });
});

// ---------------------------------------------------------------------------
// Supplies (SupplyForm, SupplyEditPageContent)
// ---------------------------------------------------------------------------

/** SupplyForm's handleSubmit transform. */
function supplyPayload(formData: any) {
  return {
    ...formData,
    unitsPerCase: formData.unitsPerCase ? Number(formData.unitsPerCase) : null,
    lowStockThreshold: formData.lowStockThreshold !== '' ? Number(formData.lowStockThreshold) : null,
  };
}

/** SupplyForm's initial state for an existing supply (edit page serializes Decimals). */
async function supplyFormData(id: string) {
  const s = await db.supply.findUniqueOrThrow({ where: { id }, include: { vendors: true } });
  return {
    name: s.name,
    sku: s.sku ?? '',
    category: s.category,
    description: s.description ?? '',
    unit: s.unit,
    unitsPerCase: s.unitsPerCase ?? '',
    costPerUnit: Number(s.costPerUnit),
    quantityOnHand: Number(s.quantityOnHand),
    lowStockThreshold: s.lowStockThreshold != null ? Number(s.lowStockThreshold) : '',
    vendorIds: s.vendors.map((v) => v.vendorId),
  };
}

describe('supplies', () => {
  it('creates a supply with vendorIds using the SupplyForm payload', async () => {
    const formData = {
      name: tag('Kraft bag'),
      sku: '',
      category: 'PACKAGING',
      description: '',
      unit: 'each',
      unitsPerCase: '500',
      costPerUnit: 0.25,
      quantityOnHand: 200,
      lowStockThreshold: '50',
      vendorIds: [shared.vendorId, shared.vendor2Id],
    };
    const supply = ok(await createSupply({ bakeryId: auth.user.bakeryId, ...supplyPayload(formData) }));
    expect(supply.id).toBeTruthy();
    shared.supplyId = supply.id;

    const row = await db.supply.findUniqueOrThrow({ where: { id: supply.id }, include: { vendors: true } });
    expect(row).toMatchObject({ sku: null, description: null, unitsPerCase: 500, category: 'PACKAGING' });
    expect(Number(row.lowStockThreshold)).toBe(50);
    expect(row.vendors.map((v) => v.vendorId).sort()).toEqual([shared.vendorId, shared.vendor2Id].sort());
  });

  it('updates a supply, replacing its vendor list', async () => {
    const formData = await supplyFormData(shared.supplyId);
    formData.costPerUnit = 0.3;
    formData.vendorIds = [shared.vendor2Id];
    const supply = ok(await updateSupply({ id: shared.supplyId, ...supplyPayload(formData) }));
    expect(supply.id).toBe(shared.supplyId);

    const row = await db.supply.findUniqueOrThrow({ where: { id: shared.supplyId }, include: { vendors: true } });
    expect(Number(row.costPerUnit)).toBe(0.3);
    expect(row.vendors.map((v) => v.vendorId)).toEqual([shared.vendor2Id]);
  });

  it('removes every vendor when all are unticked (vendorIds: [])', async () => {
    const formData = await supplyFormData(shared.supplyId);
    formData.vendorIds = [];
    ok(await updateSupply({ id: shared.supplyId, ...supplyPayload(formData) }));
    expect(await db.supplyVendor.count({ where: { supplyId: shared.supplyId } })).toBe(0);
  });

  it('clears the low stock threshold when the field is emptied', async () => {
    const formData = await supplyFormData(shared.supplyId);
    formData.lowStockThreshold = '';
    ok(await updateSupply({ id: shared.supplyId, ...supplyPayload(formData) }));
    const row = await db.supply.findUniqueOrThrow({ where: { id: shared.supplyId } });
    expect(row.lowStockThreshold).toBeNull();
  });

  it('rejects another bakery\'s vendor in vendorIds', async () => {
    const formData = await supplyFormData(shared.supplyId);
    formData.vendorIds = [ids.otherVendor];
    failed(await updateSupply({ id: shared.supplyId, ...supplyPayload(formData) }), 'Vendor not found or belongs to another bakery');
  });

  it('deletes an unused supply', async () => {
    const supply = ok(
      await createSupply({
        bakeryId: auth.user.bakeryId,
        ...supplyPayload({ name: tag('Temp label'), sku: '', category: 'LABEL', description: '', unit: 'each', unitsPerCase: '', costPerUnit: 0, quantityOnHand: 0, lowStockThreshold: '', vendorIds: [] }),
      })
    );
    ok(await deleteSupply(supply.id));
    expect(await db.supply.findUnique({ where: { id: supply.id } })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Products (ProductForm, ProductEditPageContent)
// ---------------------------------------------------------------------------

type Draft = {
  id?: string;
  name: string;
  sku: string;
  squareVariationId: string;
  unitWeightG: number | null;
  batchYieldQty: number | null;
  laborCost: number;
  overheadCost: number;
  retailPrice: number | null;
  wholesalePrice: number | null;
  targetMarginPct: number | null;
  isActive: boolean;
  supplies: Array<{ supplyId: string; quantity: number; unit: string; wasteFactor: number; costOverride: number | null; notes: string }>;
};

const emptyVariation = (name = ''): Draft => ({
  name,
  sku: '',
  squareVariationId: '',
  unitWeightG: null,
  batchYieldQty: null,
  laborCost: 0,
  overheadCost: 0,
  retailPrice: null,
  wholesalePrice: null,
  targetMarginPct: null,
  isActive: true,
  supplies: [],
});

/** ProductForm.handleSubmit's payload (without bakeryId / id). */
function productPayload(formData: any, variations: Draft[]) {
  return {
    name: formData.name,
    description: formData.description || null,
    squareItemId: formData.squareItemId || null,
    recipeId: formData.recipeId,
    recipeScale: formData.recipeScale,
    isActive: formData.isActive,
    variations: variations.map((v, index) => ({
      ...(v.id ? { id: v.id } : {}),
      name: v.name,
      sku: v.sku || null,
      squareVariationId: v.squareVariationId || null,
      unitWeightG: v.unitWeightG,
      batchYieldQty: v.batchYieldQty,
      laborCost: v.laborCost,
      overheadCost: v.overheadCost,
      retailPrice: v.retailPrice,
      wholesalePrice: v.wholesalePrice,
      targetMarginPct: v.targetMarginPct,
      isActive: v.isActive,
      sortOrder: index,
      variationSupplies: v.supplies
        .filter((ps) => ps.supplyId)
        .map((ps) => ({
          supplyId: ps.supplyId,
          quantity: ps.quantity,
          unit: ps.unit,
          wasteFactor: ps.wasteFactor,
          costOverride: ps.costOverride,
          notes: ps.notes || null,
        })),
    })),
  };
}

/** Edit page serialization + ProductForm's toDrafts / initial formData. */
async function productEditState(id: string) {
  const raw = ok(await getProductById(id)) as any;
  const formData = {
    name: raw.name,
    description: raw.description ?? '',
    squareItemId: raw.squareItemId ?? '',
    recipeId: raw.recipeId,
    recipeScale: Number(raw.recipeScale),
    isActive: raw.isActive,
  };
  const drafts: Draft[] = raw.variations.map((v: any) => ({
    id: v.id,
    name: v.name,
    sku: v.sku ?? '',
    squareVariationId: v.squareVariationId ?? '',
    unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
    batchYieldQty: v.batchYieldQty,
    laborCost: Number(v.laborCost),
    overheadCost: Number(v.overheadCost),
    retailPrice: v.retailPrice != null ? Number(v.retailPrice) : null,
    wholesalePrice: v.wholesalePrice != null ? Number(v.wholesalePrice) : null,
    targetMarginPct: v.targetMarginPct != null ? Number(v.targetMarginPct) : null,
    isActive: v.isActive,
    supplies: v.variationSupplies.map((ps: any) => ({
      supplyId: ps.supply.id,
      quantity: Number(ps.quantity),
      unit: ps.unit,
      wasteFactor: Number(ps.wasteFactor),
      costOverride: ps.costOverride != null ? Number(ps.costOverride) : null,
      notes: ps.notes ?? '',
    })),
  }));
  return { formData, drafts };
}

describe('products', () => {
  it('creates a product with two variations using the ProductForm payload', async () => {
    const formData = { name: tag('Sourdough'), description: '', squareItemId: '', recipeId: shared.recipeId, recipeScale: 1, isActive: true };
    const regular = {
      ...emptyVariation('Regular'),
      batchYieldQty: 2,
      laborCost: 1.5,
      retailPrice: 12,
      supplies: [{ supplyId: shared.supplyId, quantity: 1, unit: 'each', wasteFactor: 1, costOverride: null, notes: '' }],
    };
    const small = {
      ...emptyVariation('Small'),
      unitWeightG: 400,
      sku: 'SD-S',
      retailPrice: 7,
      supplies: [{ supplyId: '', quantity: 1, unit: 'each', wasteFactor: 1, costOverride: null, notes: '' }],
    };

    const result = await createProduct({ bakeryId: auth.user.bakeryId, ...productPayload(formData, [regular, small]) } as any);
    const product = ok(result);
    expect(product!.id).toBeTruthy();
    expect(Array.isArray(result.warnings)).toBe(true);
    shared.productId = product!.id;

    const row = await db.product.findUniqueOrThrow({
      where: { id: product!.id },
      include: { variations: { orderBy: { sortOrder: 'asc' }, include: { variationSupplies: true } } },
    });
    expect(row).toMatchObject({ description: null, squareItemId: null, recipeId: shared.recipeId });
    expect(row.variations.map((v) => v.name)).toEqual(['Regular', 'Small']);
    expect(row.variations[0].variationSupplies).toHaveLength(1);
    expect(row.variations[1].variationSupplies).toHaveLength(0); // blank supply row filtered out
    expect(Number(row.variations[0].supplyCost)).toBeCloseTo(0.3);
    expect(Number(row.variations[0].ingredientCost)).toBeGreaterThan(0);
    expect(Number(row.variations[1].ingredientCost)).toBeGreaterThan(0);
    expect(row.variations[1].sku).toBe('SD-S');
  });

  it('updates a product: edits one variation, removes one, adds one', async () => {
    const { formData, drafts } = await productEditState(shared.productId);
    expect(drafts).toHaveLength(2);
    formData.description = 'Naturally leavened';
    formData.recipeScale = 2;
    const [regular] = drafts;
    regular.retailPrice = 13;
    regular.supplies[0].quantity = 2;
    const mini = { ...emptyVariation('Mini'), batchYieldQty: 20 };

    const result = await updateProduct({ id: shared.productId, ...productPayload(formData, [regular, mini]) } as any);
    const product = ok(result);
    expect(product!.id).toBe(shared.productId);
    expect(Array.isArray(result.warnings)).toBe(true);

    const row = await db.product.findUniqueOrThrow({
      where: { id: shared.productId },
      include: { variations: { orderBy: { sortOrder: 'asc' }, include: { variationSupplies: true } } },
    });
    expect(row.description).toBe('Naturally leavened');
    expect(Number(row.recipeScale)).toBe(2);
    expect(row.variations.map((v) => v.name)).toEqual(['Regular', 'Mini']);
    expect(row.variations[0].id).toBe(regular.id); // updated in place
    expect(Number(row.variations[0].retailPrice)).toBe(13);
    expect(Number(row.variations[0].variationSupplies[0].quantity)).toBe(2);
    expect(Number(row.variations[0].supplyCost)).toBeCloseTo(0.6);
  });

  it('recalculates costs after a supply price change', async () => {
    await db.supply.update({ where: { id: shared.supplyId }, data: { costPerUnit: 1 } });
    const result = await recalculateProductCost(shared.productId);
    ok(result);
    expect(Array.isArray(result.warnings)).toBe(true);
    const regular = await db.productVariation.findFirstOrThrow({ where: { productId: shared.productId, name: 'Regular' } });
    expect(Number(regular.supplyCost)).toBeCloseTo(2);
  });

  it('rejects a variation with no unit weight and no batch yield', async () => {
    const formData = { name: tag('Bad product'), description: '', squareItemId: '', recipeId: shared.recipeId, recipeScale: 1, isActive: true };
    failed(
      await createProduct({ bakeryId: auth.user.bakeryId, ...productPayload(formData, [emptyVariation('Regular')]) } as any),
      'Set a unit weight, or a batch yield'
    );
  });

  it('rejects another bakery\'s recipe', async () => {
    const formData = { name: tag('Bad product'), description: '', squareItemId: '', recipeId: ids.otherRecipe, recipeScale: 1, isActive: true };
    failed(
      await createProduct({ bakeryId: auth.user.bakeryId, ...productPayload(formData, [{ ...emptyVariation('R'), batchYieldQty: 1 }]) } as any),
      'Recipe not found or belongs to another bakery'
    );
  });

  it('refuses to delete a supply used by a product', async () => {
    failed(await deleteSupply(shared.supplyId), 'used in products');
  });

  it('refuses to delete a recipe used by a product', async () => {
    failed(await deleteRecipe(shared.recipeId), 'used by 1 product(s)');
  });

  it('deletes a product', async () => {
    const formData = { name: tag('Temp product'), description: '', squareItemId: '', recipeId: shared.recipe2Id, recipeScale: 1, isActive: true };
    const product = ok(
      await createProduct({ bakeryId: auth.user.bakeryId, ...productPayload(formData, [{ ...emptyVariation('Regular'), batchYieldQty: 4 }]) } as any)
    );
    ok(await deleteProduct(product!.id));
    expect(await db.product.findUnique({ where: { id: product!.id } })).toBeNull();
  });

  it('returns not found for a missing product', async () => {
    failed(await deleteProduct(MISSING_ID), 'Product not found');
    failed(await recalculateProductCost(MISSING_ID), 'Product not found');
  });
});

// ---------------------------------------------------------------------------
// Production sheets (ProductionSheetForm, ProductionSheetEditPageContent)
// ---------------------------------------------------------------------------

describe('production sheets', () => {
  it('still exports completeProductionSheet', () => {
    expect(typeof completeProductionSheet).toBe('function');
  });

  it('creates a sheet with the ProductionSheetForm payload and returns inventory warnings', async () => {
    uploads.length = 0;
    const scheduledFor = '2026-10-06T08:00'; // datetime-local value
    const recipeEntries = [
      { recipeId: shared.recipeId, scale: 3, order: 0 },
      { recipeId: '', scale: 1, order: 1 }, // an empty row the form filters out
    ];
    const validEntries = recipeEntries.filter((r) => r.recipeId);
    const data = {
      bakeryId: auth.user.bakeryId,
      description: tag('Morning bake'),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      notes: EMPTY_FIELD || null,
      recipes: validEntries.map((r, idx) => ({ recipeId: r.recipeId, scale: r.scale, order: idx })),
    };

    const result = await createProductionSheet(data);
    const sheet = ok(result);
    expect(sheet!.id).toBeTruthy();
    shared.sheetId = sheet!.id;

    // 3x the recipe needs 3 kg of flour against a 5 kg lot (fine), water has
    // no inventory at all (warning).
    const warnings = 'warnings' in result ? result.warnings : undefined;
    expect(warnings && warnings.length).toBeGreaterThan(0);
    const water = warnings!.find((w) => w.ingredientId === shared.waterId)!;
    expect(water).toMatchObject({ ingredientName: tag('Water'), available: 0 });
    for (const key of ['required', 'available', 'shortfall'] as const) expect(typeof water[key]).toBe('number');
    expect(typeof water.unit).toBe('string');

    const row = await db.productionSheet.findUniqueOrThrow({ where: { id: sheet!.id }, include: { recipes: true } });
    expect(row).toMatchObject({ bakeryId: ids.bakery, notes: null, completed: false });
    expect(row.scheduledFor?.getTime()).toBe(new Date(scheduledFor).getTime());
    expect(row.recipes).toHaveLength(1);
    expect(Number(row.recipes[0].scale)).toBe(3);

    expect(uploads.some((u) => u.metadata.entityId === sheet!.id)).toBe(true);
  });

  it('updates a sheet, replacing its recipe list', async () => {
    const data = {
      bakeryId: auth.user.bakeryId,
      description: tag('Morning bake (rev)'),
      scheduledFor: null,
      notes: 'Start early',
      recipes: [
        { recipeId: shared.recipeId, scale: 2, order: 0 },
        { recipeId: shared.recipe2Id, scale: 1.5, order: 1 },
      ],
    };
    const sheet = ok(await updateProductionSheet({ id: shared.sheetId, ...data }));
    expect(sheet!.recipes.map((r: any) => r.recipeId)).toEqual([shared.recipeId, shared.recipe2Id]);

    const row = await db.productionSheet.findUniqueOrThrow({ where: { id: shared.sheetId }, include: { recipes: { orderBy: { order: 'asc' } } } });
    expect(row).toMatchObject({ description: data.description, notes: 'Start early', scheduledFor: null });
    expect(row.recipes.map((r) => Number(r.scale))).toEqual([2, 1.5]);
  });

  it('adds, rescales and removes a recipe on the sheet', async () => {
    const entry = ok(await addRecipeToSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipe3Id, scale: 1 }));
    expect(entry!.recipeId).toBe(shared.recipe3Id);
    expect(entry!.order).toBe(2);

    failed(
      await addRecipeToSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipe3Id, scale: 1 }),
      'already on this production sheet'
    );

    const updated = ok(await updateRecipeOnSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipe3Id, scale: 4 }));
    expect(Number(updated!.scale)).toBe(4);

    ok(await removeRecipeFromSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipe3Id }));
    expect(await db.productionSheetRecipe.count({ where: { productionSheetId: shared.sheetId } })).toBe(2);

    failed(
      await removeRecipeFromSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipe3Id }),
      'Recipe on this production sheet not found'
    );
  });

  it('refuses to remove the last recipe', async () => {
    ok(await removeRecipeFromSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipe2Id }));
    failed(
      await removeRecipeFromSheet({ productionSheetId: shared.sheetId, recipeId: shared.recipeId }),
      'must have at least one recipe'
    );
  });

  it('rejects another bakery\'s recipe and duplicate recipes', async () => {
    failed(
      await createProductionSheet({
        bakeryId: auth.user.bakeryId,
        description: null,
        scheduledFor: null,
        notes: null,
        recipes: [{ recipeId: ids.otherRecipe, scale: 1, order: 0 }],
      }),
      'Recipe not found or belongs to another bakery'
    );
    failed(
      await updateProductionSheet({
        id: shared.sheetId,
        recipes: [
          { recipeId: shared.recipeId, scale: 1, order: 0 },
          { recipeId: shared.recipeId, scale: 2, order: 1 },
        ],
      }),
      'only appear once'
    );
  });

  it('refuses to delete a recipe that is on a sheet', async () => {
    failed(await deleteRecipe(shared.recipeId), 'production sheet(s)');
  });

  it('refuses to edit or delete a completed sheet', async () => {
    const created = ok(
      await createProductionSheet({
        bakeryId: auth.user.bakeryId,
        description: tag('Done'),
        scheduledFor: null,
        notes: null,
        recipes: [{ recipeId: shared.recipe3Id, scale: 1, order: 0 }],
      })
    );
    await db.productionSheet.update({ where: { id: created!.id }, data: { completed: true, completedAt: new Date() } });
    failed(await updateProductionSheet({ id: created!.id, description: 'x' }), 'Cannot update a completed production sheet');
    failed(await deleteProductionSheet(created!.id), 'Cannot delete a completed production sheet');
    await db.productionSheet.delete({ where: { id: created!.id } });
  });

  it('deletes a sheet (ProductionSheetEditPageContent)', async () => {
    ok(await deleteProductionSheet(shared.sheetId));
    expect(await db.productionSheet.findUnique({ where: { id: shared.sheetId } })).toBeNull();
    failed(await deleteProductionSheet(shared.sheetId), 'Production sheet not found');
  });
});

// ---------------------------------------------------------------------------
// Recipe delete, after products and sheets are gone
// ---------------------------------------------------------------------------

describe('recipe delete', () => {
  it('deletes a recipe once products and sheets no longer use it', async () => {
    await db.product.deleteMany({ where: { recipeId: shared.recipeId } });
    ok(await deleteRecipe(shared.recipeId));
    expect(await db.recipe.findUnique({ where: { id: shared.recipeId } })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Equipment (EquipmentForm, EquipmentEditPageContent)
// ---------------------------------------------------------------------------

/** EquipmentForm initial state for an existing item. */
async function equipmentFormData(id: string) {
  const e = await db.equipment.findUniqueOrThrow({ where: { id } });
  return {
    name: e.name,
    status: e.status,
    vendorId: e.vendorId ?? '',
    purchaseDate: e.purchaseDate ? new Date(e.purchaseDate).toISOString().split('T')[0] : '',
    cost: e.cost ? Number(e.cost) : 0,
    quantity: e.quantity ?? 1,
    serialNumber: e.serialNumber ?? '',
    notes: e.notes ?? '',
  };
}

/** EquipmentForm.handleSubmit's overrides. */
function equipmentPayload(formData: any) {
  return {
    ...formData,
    vendorId: formData.vendorId || null,
    purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
    cost: formData.cost || null,
    serialNumber: formData.serialNumber || null,
    notes: formData.notes || null,
  };
}

describe('equipment', () => {
  let equipmentId = '';

  it('creates equipment with the EquipmentForm defaults', async () => {
    const formData = {
      name: tag('Deck oven'),
      status: 'CONSIDERING',
      vendorId: '',
      purchaseDate: '',
      cost: 0,
      quantity: 1,
      serialNumber: '',
      notes: '',
    };
    const equipment = ok(await createEquipment({ bakeryId: auth.user.bakeryId, ...equipmentPayload(formData) }));
    expect(equipment.id).toBeTruthy();
    equipmentId = equipment.id;
    const row = await db.equipment.findUniqueOrThrow({ where: { id: equipmentId } });
    expect(row).toMatchObject({ status: 'CONSIDERING', vendorId: null, purchaseDate: null, cost: null, quantity: 1, serialNumber: null });
  });

  it('updates with a purchase date (YYYY-MM-DD from the date input), cost and vendor', async () => {
    const formData = await equipmentFormData(equipmentId);
    Object.assign(formData, { status: 'ORDERED', purchaseDate: '2026-09-15', cost: 12999.99, vendorId: shared.vendorId, serialNumber: 'SN-1' });
    const equipment = ok(await updateEquipment({ id: equipmentId, ...equipmentPayload(formData) }));
    expect(equipment.id).toBe(equipmentId);

    const row = await db.equipment.findUniqueOrThrow({ where: { id: equipmentId } });
    expect(row.status).toBe('ORDERED');
    expect(row.purchaseDate?.toISOString().slice(0, 10)).toBe('2026-09-15');
    expect(Number(row.cost)).toBeCloseTo(12999.99);
    expect(row.vendorId).toBe(shared.vendorId);

    const log = await db.activityLog.findFirst({ where: { entityId: equipmentId, action: 'UPDATE' }, orderBy: { createdAt: 'desc' } });
    expect(log?.description).toContain('from CONSIDERING to ORDERED');
  });

  it('round-trips the saved purchase date through the edit form unchanged', async () => {
    const formData = await equipmentFormData(equipmentId);
    expect(formData.purchaseDate).toBe('2026-09-15');
    ok(await updateEquipment({ id: equipmentId, ...equipmentPayload(formData) }));
    const row = await db.equipment.findUniqueOrThrow({ where: { id: equipmentId } });
    expect(row.purchaseDate?.toISOString().slice(0, 10)).toBe('2026-09-15');
  });

  it('clears cost, purchase date, vendor and serial number', async () => {
    const formData = await equipmentFormData(equipmentId);
    Object.assign(formData, { cost: 0, purchaseDate: '', vendorId: '', serialNumber: '' });
    ok(await updateEquipment({ id: equipmentId, ...equipmentPayload(formData) }));
    const row = await db.equipment.findUniqueOrThrow({ where: { id: equipmentId } });
    expect(row).toMatchObject({ cost: null, purchaseDate: null, vendorId: null, serialNumber: null });
  });

  it('rejects another bakery\'s vendor', async () => {
    const formData = await equipmentFormData(equipmentId);
    formData.vendorId = ids.otherVendor;
    failed(await updateEquipment({ id: equipmentId, ...equipmentPayload(formData) }), 'Vendor not found or belongs to another bakery');
  });

  it('deletes equipment', async () => {
    ok(await deleteEquipment(equipmentId));
    expect(await db.equipment.findUnique({ where: { id: equipmentId } })).toBeNull();
    failed(await deleteEquipment(equipmentId), 'Equipment not found');
  });
});

// ---------------------------------------------------------------------------
// Tags and tag types (TagTypeForm, TagForm, TagManager, *EditPageContent)
// ---------------------------------------------------------------------------

describe('tags and tag types', () => {
  let tagTypeId = '';
  let tagId = '';
  let quickTagId = '';
  let recipeForTags = '';

  it('creates and updates a tag type with the TagTypeForm payloads', async () => {
    const created = ok(
      await createTagType({ bakeryId: auth.user.bakeryId, name: tag('Diet'), description: EMPTY_FIELD || undefined, order: 0 })
    );
    tagTypeId = created!.id;
    expect(created!.description).toBeNull();

    const updated = ok(await updateTagType({ id: tagTypeId, name: tag('Dietary'), description: EMPTY_FIELD || null, order: 2 }));
    expect(updated).toMatchObject({ name: tag('Dietary'), order: 2, description: null });
  });

  it('creates a tag with the TagForm payload and one via TagManager quick-create', async () => {
    const created = ok(
      await createTag({ bakeryId: auth.user.bakeryId, tagTypeId, name: tag('Vegan'), description: EMPTY_FIELD || undefined, color: '#6366f1' })
    );
    tagId = created!.id;

    const quick = ok(await createTag({ bakeryId: auth.user.bakeryId, tagTypeId, name: tag('Nut free'), color: undefined }));
    // TagManager reads result.data.id, .name, .color, .tagType
    expect(quick).toMatchObject({ name: tag('Nut free'), color: null });
    expect(quick!.tagType.id).toBe(tagTypeId);
    quickTagId = quick!.id;
  });

  it('rejects a duplicate tag name with a readable message', async () => {
    failed(
      await createTag({ bakeryId: auth.user.bakeryId, tagTypeId, name: tag('Vegan'), color: '#000000' }),
      'already exists in this tag type'
    );
  });

  it('updates a tag with the TagForm edit payload', async () => {
    const updated = ok(await updateTag({ id: tagId, name: tag('Plant based'), description: EMPTY_FIELD || null, color: '#22c55e' }));
    expect(updated).toMatchObject({ name: tag('Plant based'), color: '#22c55e', description: null });
  });

  it('assigns and unassigns tags on a recipe, ingredient and vendor (TagManager)', async () => {
    recipeForTags = shared.recipe3Id;
    for (const [entityType, entityId] of [
      ['recipe', recipeForTags],
      ['ingredient', shared.flourId],
      ['vendor', shared.vendor2Id],
    ] as const) {
      const assigned = ok(await assignTagToEntity({ tagId, entityType, entityId }));
      expect(assigned!.tagId).toBe(tagId);
      expect(await db.entityTag.count({ where: { tagId, entityType, entityId } })).toBe(1);

      failed(await assignTagToEntity({ tagId, entityType, entityId }), 'already assigned');

      ok(await unassignTagFromEntity({ tagId, entityType, entityId }));
      expect(await db.entityTag.count({ where: { tagId, entityType, entityId } })).toBe(0);
    }
    failed(await unassignTagFromEntity({ tagId, entityType: 'recipe', entityId: recipeForTags }), 'Tag assignment not found');
  });

  it('rejects tagging another bakery\'s recipe', async () => {
    failed(await assignTagToEntity({ tagId, entityType: 'recipe', entityId: ids.otherRecipe }), 'Recipe not found or belongs to another bakery');
  });

  it('removes tag assignments when the tagged recipe is deleted', async () => {
    ok(await assignTagToEntity({ tagId: quickTagId, entityType: 'recipe', entityId: recipeForTags }));
    await db.productionSheet.deleteMany({ where: { bakeryId: ids.bakery } });
    ok(await deleteRecipe(recipeForTags));
    expect(await db.entityTag.count({ where: { entityType: 'recipe', entityId: recipeForTags } })).toBe(0);
  });

  it('refuses to delete a tag type that still has tags, then deletes tags and the type', async () => {
    failed(await deleteTagType(tagTypeId), 'Cannot delete tag type with 2 tag(s)');
    ok(await deleteTag(tagId));
    ok(await deleteTag(quickTagId));
    ok(await deleteTagType(tagTypeId));
    expect(await db.tagType.findUnique({ where: { id: tagTypeId } })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Admin actions (platform admin)
// ---------------------------------------------------------------------------

describe('admin actions', () => {
  beforeEach(async () => {
    await signInAsAdmin();
  });

  const fromUnit = `tf${run}`;
  const toUnit = `tt${run}`;
  let roleId = '';
  let newBakeryId = '';

  it('rejects admin actions for a non-admin with a readable message', async () => {
    await signInAsBaker();
    failed(await createRole({ name: tag('Nope'), permissions: {} }), 'Only platform administrators can create roles');
    failed(await createUnitConversion({ fromUnit: 'a', toUnit: 'b', factor: 1, category: 'x' }), 'Only platform administrators');
    failed(await createBakery({ name: 'x' }), 'Only platform administrators can create bakeries');
  });

  it('creates, updates and deletes a unit conversion', async () => {
    ids.conversionUnits.push(fromUnit);
    const created = ok(await createUnitConversion({ fromUnit, toUnit, factor: 2.5, category: 'test' }));
    expect(Number(created!.factor)).toBe(2.5);

    failed(await createUnitConversion({ fromUnit, toUnit, factor: 3, category: 'test' }), 'already exists');

    const updated = ok(await updateUnitConversion({ id: created!.id, factor: 4 }));
    expect(Number(updated!.factor)).toBe(4);
    expect(updated!.category).toBe('test');

    ok(await deleteUnitConversion({ id: created!.id }));
    expect(await db.unitConversion.findUnique({ where: { id: created!.id } })).toBeNull();
    failed(await deleteUnitConversion({ id: created!.id }), 'Unit conversion not found');
  });

  it('creates and updates a role with the RoleForm payloads', async () => {
    const permissions = { 'recipes.read': true, 'recipes.write': false };
    // RoleForm sends the FormData string, '' when the description is empty.
    const created = ok(await createRole({ name: tag('Baker role'), description: '', permissions }));
    roleId = created!.id;
    ids.createdRoles.push(roleId);
    expect(created!.description).toBeNull();
    expect(created!.permissions).toEqual(permissions);

    failed(await createRole({ name: tag('Baker role'), description: '', permissions }), 'already exists');

    const updated = ok(
      await updateRole({ id: roleId, name: tag('Head baker'), description: 'Runs the bake', permissions: { ...permissions, 'recipes.write': true } })
    );
    expect(updated).toMatchObject({ name: tag('Head baker'), description: 'Runs the bake' });
    expect((updated!.permissions as any)['recipes.write']).toBe(true);
  });

  it('creates and updates a bakery with the BakeryForm FormData payload', async () => {
    const created = ok(
      await createBakery({ name: tag('Action Test New'), description: '', address: '', phone: '', email: '', website: '' })
    );
    newBakeryId = created!.id;
    ids.createdBakeries.push(newBakeryId);
    // BakeryForm redirects to /admin/bakeries/${result.data.id}/edit
    expect(created!.id).toBeTruthy();
    expect(created!.slug).toBe(`action-test-new-${run}`);

    const updated = ok(
      await updateBakery({
        id: newBakeryId,
        name: tag('Action Test New'),
        description: 'Second location',
        address: '1 Main St',
        phone: '(555) 010-0000',
        email: 'hello@bakery.example',
        website: 'https://bakery.example',
      })
    );
    expect(updated).toMatchObject({ description: 'Second location', email: 'hello@bakery.example' });

    failed(await updateBakery({ id: newBakeryId, name: 'x', email: 'not-an-email' }), 'Invalid email address');

    const log = await db.activityLog.findFirst({ where: { entityId: newBakeryId, action: 'CREATE' } });
    expect(log).toMatchObject({ userId: ids.admin, bakeryId: newBakeryId });
  });

  it('assigns and unassigns a user to a bakery (BakeryForm / UserAssignmentForm)', async () => {
    const assigned = ok(await assignUserToBakery(ids.target, newBakeryId));
    // BakeryForm reads result.data.id, .name, .email, .role
    expect(assigned).toMatchObject({ id: ids.target, name: 'Target User', email: `target-${run}@example.test` });
    expect('role' in assigned!).toBe(true);
    expect(await db.userBakery.count({ where: { userId: ids.target, bakeryId: newBakeryId } })).toBe(1);

    failed(await assignUserToBakery(ids.target, newBakeryId), 'already assigned');
    failed(await deleteBakery(newBakeryId), 'active user(s)');

    ok(await unassignUserFromBakery(ids.target, newBakeryId));
    expect(await db.userBakery.count({ where: { userId: ids.target, bakeryId: newBakeryId } })).toBe(0);
    failed(await unassignUserFromBakery(ids.target, newBakeryId), 'not assigned to this bakery');
  });

  it('assigns and clears a user role (UserAssignmentForm)', async () => {
    const withRole = ok(await assignUserRole(ids.target, roleId));
    expect(withRole!.role?.id).toBe(roleId);

    failed(await deleteRole(roleId), 'assigned user(s)');

    const cleared = ok(await assignUserRole(ids.target, EMPTY_FIELD || null));
    expect(cleared!.roleId).toBeNull();

    failed(await assignUserRole(ids.target, MISSING_ID), 'Role not found');
  });

  it('creates an invitation (InvitationForm), emails it, then revokes and deletes it', async () => {
    emails.length = 0;
    const email = `invitee-${run}@example.test`;
    const invitation = ok(await createInvitation({ email, bakeryId: newBakeryId || null, roleId: roleId || null }));
    expect(invitation).toMatchObject({ email, bakeryId: newBakeryId, roleId, status: 'PENDING', createdBy: ids.admin });
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ toEmail: email, bakeryName: tag('Action Test New') });
    expect(emails[0].inviteUrl).toContain(invitation!.token);

    failed(await createInvitation({ email, bakeryId: null, roleId: null }), 'already pending');
    failed(await createInvitation({ email: `target-${run}@example.test`, bakeryId: EMPTY_FIELD || null, roleId: EMPTY_FIELD || null }), 'user with this email already exists');

    ok(await revokeInvitation(invitation!.id));
    expect((await db.invitation.findUniqueOrThrow({ where: { id: invitation!.id } })).status).toBe('REVOKED');

    ok(await deleteInvitation(invitation!.id));
    expect(await db.invitation.findUnique({ where: { id: invitation!.id } })).toBeNull();
    failed(await revokeInvitation(invitation!.id), 'Invitation not found');
  });

  it('creates a platform-level invitation with no bakery', async () => {
    const email = `platform-${run}@example.test`;
    const invitation = ok(await createInvitation({ email, bakeryId: EMPTY_FIELD || null, roleId: EMPTY_FIELD || null }));
    expect(invitation).toMatchObject({ bakeryId: null, roleId: null });
    const log = await db.activityLog.findFirst({ where: { entityId: invitation!.id } });
    expect(log?.bakeryId).toBeNull();
    ok(await deleteInvitation(invitation!.id));
  });

  it('deletes the role, the bakery and the user', async () => {
    ok(await deleteRole(roleId));
    expect(await db.role.findUnique({ where: { id: roleId } })).toBeNull();

    ok(await deleteBakery(newBakeryId));
    expect(await db.bakery.findUnique({ where: { id: newBakeryId } })).toBeNull();

    ok(await deleteUser(ids.target));
    expect(await db.user.findUnique({ where: { id: ids.target } })).toBeNull();
    failed(await deleteUser(ids.target), 'User not found');
  });
});
