import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { Decimal } from '@/generated/prisma/runtime/library';
import { db } from '@/lib/db';
import { resolveApiAuth, hasScope } from '@/lib/api/auth';
import { parsePagination, paginationMeta } from '@/lib/api/pagination';
import { apiSuccess, apiError, api401, api403, api404, api422 } from '@/lib/api/responses';
import { addInventoryLotSchema } from '@/lib/validations/inventory';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');

    const pagination = parsePagination(req);

    const where = {
      inventory: {
        bakeryId: auth.bakeryId,
      },
    };

    const [data, total] = await Promise.all([
      db.inventoryLot.findMany({
        where,
        include: {
          inventory: {
            include: { ingredient: { select: { id: true, name: true, unit: true } } },
          },
          vendor: { select: { id: true, name: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [pagination.sort]: pagination.order },
      }),
      db.inventoryLot.count({ where }),
    ]);

    return apiSuccess(data, paginationMeta(pagination.page, pagination.limit, total));
  } catch (error) {
    console.error('API GET /inventory-lots error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    let body;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    // Parse dates if provided as strings
    if (body.expiresAt && typeof body.expiresAt === 'string') {
      body.expiresAt = new Date(body.expiresAt);
    }

    let validatedData;
    try {
      validatedData = addInventoryLotSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return api422(err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
      }
      throw err;
    }

    // Verify ingredient belongs to user's bakery
    const ingredient = await db.ingredient.findFirst({
      where: { id: validatedData.ingredientId, bakeryId: auth.bakeryId },
      include: { inventory: true },
    });
    if (!ingredient) return api404('Ingredient');

    // Validate vendor if provided
    if (validatedData.vendorId) {
      const vendor = await db.vendor.findFirst({
        where: { id: validatedData.vendorId, bakeryId: auth.bakeryId },
      });
      if (!vendor) return api404('Vendor');
    }

    const result = await db.$transaction(async (tx) => {
      // Get or create Inventory record
      let inventory = ingredient.inventory;
      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            bakeryId: auth.bakeryId!,
            ingredientId: ingredient.id,
            displayUnit: ingredient.unit,
          },
        });
      }

      // Create lot — compute cost per unit from total cost
      const costPerUnit = validatedData.quantity > 0
        ? validatedData.totalCost / validatedData.quantity
        : 0;
      return tx.inventoryLot.create({
        data: {
          inventoryId: inventory.id,
          purchaseQty: new Decimal(validatedData.quantity),
          remainingQty: new Decimal(validatedData.quantity),
          purchaseUnit: validatedData.unit,
          costPerUnit: new Decimal(costPerUnit),
          expiresAt: validatedData.expiresAt,
          vendorId: validatedData.vendorId,
          notes: validatedData.notes,
        },
        include: {
          inventory: {
            include: { ingredient: { select: { id: true, name: true, unit: true } } },
          },
          vendor: { select: { id: true, name: true } },
        },
      });
    });

    return apiSuccess(result);
  } catch (error) {
    console.error('API POST /inventory-lots error:', error);
    return apiError('Internal server error', 500);
  }
}
