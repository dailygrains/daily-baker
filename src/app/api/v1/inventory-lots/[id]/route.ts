import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { db } from '@/lib/db';
import { resolveApiAuth, hasScope } from '@/lib/api/auth';
import { apiSuccess, apiError, api401, api403, api404, api422 } from '@/lib/api/responses';
import { updateInventoryLotSchema } from '@/lib/validations/inventory';

type Params = { params: Promise<{ id: string }> };

async function findLotForBakery(id: string, bakeryId: string | null) {
  return db.inventoryLot.findFirst({
    where: {
      id,
      inventory: { bakeryId: bakeryId ?? undefined },
    },
    include: {
      inventory: {
        include: { ingredient: { select: { id: true, name: true, unit: true } } },
      },
      vendor: { select: { id: true, name: true } },
    },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');

    const { id } = await params;
    const lot = await findLotForBakery(id, auth.bakeryId);
    if (!lot) return api404('Inventory lot');

    return apiSuccess(lot);
  } catch (error) {
    console.error('API GET /inventory-lots/:id error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    const { id } = await params;
    const existing = await findLotForBakery(id, auth.bakeryId);
    if (!existing) return api404('Inventory lot');

    let body;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    body.id = id;

    // Parse dates if provided as strings
    if (body.expiresAt && typeof body.expiresAt === 'string') {
      body.expiresAt = new Date(body.expiresAt);
    }

    let validatedData;
    try {
      validatedData = updateInventoryLotSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return api422(err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
      }
      throw err;
    }

    // Validate vendor if provided
    if (validatedData.vendorId) {
      const vendor = await db.vendor.findFirst({
        where: { id: validatedData.vendorId, bakeryId: auth.bakeryId },
      });
      if (!vendor) return api404('Vendor');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...updateData } = validatedData;
    const record = await db.inventoryLot.update({
      where: { id },
      data: updateData,
      include: {
        inventory: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
        vendor: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(record);
  } catch (error) {
    console.error('API PUT /inventory-lots/:id error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    const { id } = await params;
    const existing = await findLotForBakery(id, auth.bakeryId);
    if (!existing) return api404('Inventory lot');

    await db.inventoryLot.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('API DELETE /inventory-lots/:id error:', error);
    return apiError('Internal server error', 500);
  }
}
