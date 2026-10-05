import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { ServiceError, type ServiceContext } from '@/lib/services/context';
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
  /**
   * Shared service functions (the same ones the dashboard's server actions
   * call). When set they replace the generic Prisma write, and own
   * validation, tenant checks, derived fields, guards and activity logging.
   * `validators` are then used only for the OpenAPI spec.
   */
  service?: {
    create?: (ctx: ServiceContext, body: Record<string, unknown>) => Promise<unknown>;
    update?: (ctx: ServiceContext, id: string, body: Record<string, unknown>) => Promise<unknown>;
    remove?: (ctx: ServiceContext, id: string) => Promise<unknown>;
  };
}

export function serviceContext(auth: ApiAuthContext): ServiceContext {
  return {
    bakeryId: auth.bakeryId || null,
    userId: auth.userId,
    isPlatformAdmin: auth.isPlatformAdmin,
  };
}

/**
 * Map an error thrown by a handler to a response: expected service and
 * validation failures keep their status; anything else is a logged 500.
 */
export function apiErrorResponse(error: unknown, label: string) {
  if (error instanceof ServiceError) {
    return apiError(error.message, error.status, error.details);
  }
  if (error instanceof ZodError) {
    return api422(error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  }
  console.error(`API ${label} error:`, error);
  return apiError('Internal server error', 500);
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
          // Don't let a plain "a" overwrite a nested include built from "a.b".
          if (!current[part]) current[part] = true;
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
  /**
   * Bakery-scoped routes must have a bakery to scope by. Without this, a
   * signed-in user with no bakery would get an empty filter and see every
   * tenant's rows.
   */
  const missingBakery = (auth: ApiAuthContext) => config.bakeryScoped && !auth.bakeryId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (db as Record<string, any>)[config.model];

  // --- Collection handlers (GET list, POST create) ---

  async function listHandler(req: NextRequest) {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');
    if (missingBakery(auth)) return api403('No bakery is associated with this account');

    const pagination = parsePagination(req);
    const where = {
      ...(config.bakeryScoped ? { bakeryId: auth.bakeryId } : {}),
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
    if (missingBakery(auth)) return api403('No bakery is associated with this account');

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    if (config.service?.create) {
      return apiSuccess(await config.service.create(serviceContext(auth), body));
    }

    // Inject bakeryId for bakery-scoped models
    if (config.bakeryScoped) {
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

    const record = await prismaModel.create({ data: body });

    return apiSuccess(record);
  }

  // --- Single-record handlers (GET one, PUT update, DELETE) ---

  async function getOneHandler(req: NextRequest, id: string) {
    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'read')) return api403('Insufficient scope');
    if (missingBakery(auth)) return api403('No bakery is associated with this account');

    const pagination = parsePagination(req);
    const include = buildInclude(pagination.include, config.allowedIncludes, config.defaultInclude);

    const where: Record<string, unknown> = { id };
    if (config.bakeryScoped) {
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
    if (missingBakery(auth)) return api403('No bakery is associated with this account');

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    if (config.service?.update) {
      return apiSuccess(await config.service.update(serviceContext(auth), id, body));
    }

    // Verify record exists and belongs to bakery
    const existing = await prismaModel.findFirst({
      where: {
        id,
        ...(config.bakeryScoped ? { bakeryId: auth.bakeryId } : {}),
      },
    });
    if (!existing) return api404();

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

    // Remove id from update data. Records never move between bakeries.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...updateData } = body;
    if (config.bakeryScoped) delete updateData.bakeryId;

    const record = await prismaModel.update({ where: { id }, data: updateData });

    return apiSuccess(record);
  }

  async function deleteHandler(req: NextRequest, id: string) {
    if (config.readOnly) return apiError('This resource is read-only', 405);

    const auth = await resolveApiAuth(req);
    if (!auth) return api401();
    if (config.adminOnly && !auth.isPlatformAdmin) return api403();
    if (!hasScope(auth, 'write')) return api403('Insufficient scope');
    if (missingBakery(auth)) return api403('No bakery is associated with this account');

    if (config.service?.remove) {
      await config.service.remove(serviceContext(auth), id);
      return apiSuccess({ deleted: true });
    }

    const existing = await prismaModel.findFirst({
      where: {
        id,
        ...(config.bakeryScoped ? { bakeryId: auth.bakeryId } : {}),
      },
    });
    if (!existing) return api404();

    await prismaModel.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  }

  // --- Return handlers for collection and single-record routes ---

  return {
    /** The route's configuration, for the OpenAPI generator. */
    config,
    // For /api/v1/{model}/route.ts
    collection: {
      GET: async (req: NextRequest) => {
        try {
          return await listHandler(req);
        } catch (error) {
          return apiErrorResponse(error, `GET /${config.model}`);
        }
      },
      POST: async (req: NextRequest) => {
        try {
          return await createHandler(req);
        } catch (error) {
          return apiErrorResponse(error, `POST /${config.model}`);
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
          return apiErrorResponse(error, `GET /${config.model}/:id`);
        }
      },
      PUT: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await updateHandler(req, id);
        } catch (error) {
          return apiErrorResponse(error, `PUT /${config.model}/:id`);
        }
      },
      DELETE: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const { id } = await params;
          return await deleteHandler(req, id);
        } catch (error) {
          return apiErrorResponse(error, `DELETE /${config.model}/:id`);
        }
      },
    },
  };
}
