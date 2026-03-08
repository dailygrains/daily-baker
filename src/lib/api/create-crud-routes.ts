import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { db } from '@/lib/db';
import { resolveApiAuth, hasScope, type ApiAuthContext } from './auth';
import { parsePagination, paginationMeta } from './pagination';
import { apiSuccess, apiError, api401, api403, api404, api422 } from './responses';

type PrismaModel = keyof typeof db & string;

export interface CrudRouteConfig {
  model: PrismaModel;
  bakeryScoped: boolean;
  searchFields?: string[];
  defaultInclude?: Record<string, unknown>;
  allowedIncludes?: string[];
  validators?: {
    create?: ZodSchema;
    update?: ZodSchema;
  };
  readOnly?: boolean;
  adminOnly?: boolean;
  beforeCreate?: (data: Record<string, unknown>, auth: ApiAuthContext) => Record<string, unknown> | Promise<Record<string, unknown>>;
  afterCreate?: (record: unknown, auth: ApiAuthContext) => void | Promise<void>;
  beforeDelete?: (id: string, auth: ApiAuthContext) => void | Promise<void>;
}

/**
 * Build an include object from ?include= query param,
 * filtered against allowedIncludes.
 */
function buildInclude(
  requested: string[],
  allowed: string[] | undefined,
  defaults: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = { ...defaults };

  if (!allowed || requested.length === 0) return Object.keys(result).length ? result : undefined;

  for (const inc of requested) {
    if (allowed.includes(inc)) {
      // Handle dot-notation: "sections.ingredients" → { sections: { include: { ingredients: true } } }
      const parts = inc.split('.');
      let current = result;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = true;
        } else {
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = { include: {} };
          }
          current = (current[part] as Record<string, unknown>).include as Record<string, unknown>;
        }
      }
    }
  }

  return Object.keys(result).length ? result : undefined;
}

function buildSearchWhere(search: string | null, fields: string[] | undefined) {
  if (!search || !fields?.length) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
  };
}

export function createCrudRoutes(config: CrudRouteConfig) {
  const prismaModel = (db as Record<string, any>)[config.model];

  // --- Collection handlers (GET list, POST create) ---

  async function listHandler(req: NextRequest) {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');

    const pagination = parsePagination(req);
    const where = {
      ...(config.bakeryScoped && auth.bakeryId ? { bakeryId: auth.bakeryId } : {}),
      ...buildSearchWhere(pagination.search, config.searchFields),
    };

    const include = buildInclude(pagination.include, config.allowedIncludes, config.defaultInclude);

    const [data, total] = await Promise.all([
      prismaModel.findMany({
        where,
        ...(include && { include }),
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [pagination.sort]: pagination.order },
      }),
      prismaModel.count({ where }),
    ]);

    return apiSuccess(data, paginationMeta(pagination.page, pagination.limit, total));
  }

  async function createHandler(req: NextRequest) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    // Inject bakeryId for bakery-scoped models
    if (config.bakeryScoped && auth.bakeryId) {
      body.bakeryId = auth.bakeryId;
    }

    // Validate
    if (config.validators?.create) {
      try {
        body = config.validators.create.parse(body) as Record<string, unknown>;
      } catch (err) {
        if (err instanceof ZodError) {
          return api422(err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
        }
        throw err;
      }
    }

    if (config.beforeCreate) {
      body = await config.beforeCreate(body, auth);
    }

    const record = await prismaModel.create({ data: body });

    if (config.afterCreate) {
      await config.afterCreate(record, auth);
    }

    return apiSuccess(record);
  }

  // --- Single-record handlers (GET one, PUT update, DELETE) ---

  async function getOneHandler(req: NextRequest, id: string) {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');

    const pagination = parsePagination(req);
    const include = buildInclude(pagination.include, config.allowedIncludes, config.defaultInclude);

    const where: Record<string, unknown> = { id };
    if (config.bakeryScoped && auth.bakeryId) {
      where.bakeryId = auth.bakeryId;
    }

    const record = await prismaModel.findFirst({ where, ...(include && { include }) });
    if (!record) return api404();

    return apiSuccess(record);
  }

  async function updateHandler(req: NextRequest, id: string) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    // Verify record exists and belongs to bakery
    const existing = await prismaModel.findFirst({
      where: {
        id,
        ...(config.bakeryScoped && auth.bakeryId ? { bakeryId: auth.bakeryId } : {}),
      },
    });
    if (!existing) return api404();

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    body.id = id;

    if (config.validators?.update) {
      try {
        body = config.validators.update.parse(body) as Record<string, unknown>;
      } catch (err) {
        if (err instanceof ZodError) {
          return api422(err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
        }
        throw err;
      }
    }

    // Remove id from update data
    const { id: _id, ...updateData } = body;
    const record = await prismaModel.update({ where: { id }, data: updateData });

    return apiSuccess(record);
  }

  async function deleteHandler(req: NextRequest, id: string) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');

    const existing = await prismaModel.findFirst({
      where: {
        id,
        ...(config.bakeryScoped && auth.bakeryId ? { bakeryId: auth.bakeryId } : {}),
      },
    });
    if (!existing) return api404();

    if (config.beforeDelete) {
      await config.beforeDelete(id, auth);
    }

    await prismaModel.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  }

  // --- Return handlers for collection and single-record routes ---

  return {
    // For /api/v1/{model}/route.ts
    collection: {
      GET: async (req: NextRequest) => {
        try {
          return await listHandler(req);
        } catch (error) {
          console.error(`API GET /${config.model} error:`, error);
          return apiError('Internal server error', 500);
        }
      },
      POST: async (req: NextRequest) => {
        try {
          return await createHandler(req);
        } catch (error) {
          console.error(`API POST /${config.model} error:`, error);
          return apiError('Internal server error', 500);
        }
      },
    },
    // For /api/v1/{model}/[id]/route.ts
    single: {
      GET: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await getOneHandler(req, id);
        } catch (error) {
          console.error(`API GET /${config.model}/:id error:`, error);
          return apiError('Internal server error', 500);
        }
      },
      PUT: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await updateHandler(req, id);
        } catch (error) {
          console.error(`API PUT /${config.model}/:id error:`, error);
          return apiError('Internal server error', 500);
        }
      },
      DELETE: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await deleteHandler(req, id);
        } catch (error) {
          console.error(`API DELETE /${config.model}/:id error:`, error);
          return apiError('Internal server error', 500);
        }
      },
    },
  };
}
