import { toJSONSchema, type ZodType } from 'zod';
import { routeRegistry, type RouteRegistryEntry } from './route-registry';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convert a Zod schema to a JSON Schema object suitable for OpenAPI 3.1.
 * Strips the top-level `$schema` key since OpenAPI embeds schemas inline.
 * Handles z.date() by converting to { type: "string", format: "date-time" }.
 */
function zodToOpenApiSchema(schema: ZodType): Record<string, unknown> {
  const raw = toJSONSchema(schema, {
    // z.date() cannot be natively represented; emit {} then patch via override
    unrepresentable: 'any',
    override: ({
      zodSchema,
      jsonSchema,
    }: {
      zodSchema: { _zod?: { def?: { type?: string } } };
      jsonSchema: Record<string, unknown>;
    }) => {
      if (zodSchema._zod?.def?.type === 'date') {
        jsonSchema.type = 'string';
        jsonSchema.format = 'date-time';
      }
    },
  }) as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...rest } = raw;
  return rest;
}

function tag(entry: RouteRegistryEntry) {
  return entry.name;
}

function descriptionForList(entry: RouteRegistryEntry) {
  const parts = [`List ${entry.name.toLowerCase()} with pagination.`];
  if (entry.adminOnly) parts.push('Requires platform admin.');
  return parts.join(' ');
}

/* -------------------------------------------------------------------------- */
/*  Shared component schemas                                                   */
/* -------------------------------------------------------------------------- */

function buildComponents() {
  return {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT or API Key',
        description:
          'Authenticate with either a Clerk JWT (from the session) or a Daily Baker API key.',
      },
    },
    schemas: {
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 25 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 4 },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {},
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['success', 'data'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: { type: 'string' },
          details: {},
        },
        required: ['success', 'error'],
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number (1-based)',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page (max 100)',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: 'Search term (case-insensitive)',
        schema: { type: 'string' },
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Field to sort by',
        schema: { type: 'string', default: 'createdAt' },
      },
      OrderParam: {
        name: 'order',
        in: 'query',
        description: 'Sort direction',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      },
      IncludeParam: {
        name: 'include',
        in: 'query',
        description:
          'Comma-separated list of relations to include (e.g. "vendor,inventory")',
        schema: { type: 'string' },
      },
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Standard response helpers                                                  */
/* -------------------------------------------------------------------------- */

const unauthorizedResponse = {
  description: 'Unauthorized - missing or invalid authentication',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const forbiddenResponse = {
  description: 'Forbidden - insufficient permissions',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const notFoundResponse = {
  description: 'Resource not found',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const validationErrorResponse = {
  description: 'Validation error',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const serverErrorResponse = {
  description: 'Internal server error',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const successResponseWithMeta = {
  description: 'Successful response',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessResponse' },
    },
  },
};

const successResponse = {
  description: 'Successful response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'object' },
        },
        required: ['success', 'data'],
      },
    },
  },
};

const deleteSuccessResponse = {
  description: 'Successfully deleted',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: { deleted: { type: 'boolean', enum: [true] } },
          },
        },
        required: ['success', 'data'],
      },
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Path builders                                                              */
/* -------------------------------------------------------------------------- */

function buildListPath(entry: RouteRegistryEntry) {
  const includeDescription = entry.allowedIncludes?.length
    ? `Allowed include values: ${entry.allowedIncludes.join(', ')}`
    : undefined;

  const searchDescription = entry.searchFields?.length
    ? `Searchable fields: ${entry.searchFields.join(', ')}`
    : undefined;

  const description = [
    descriptionForList(entry),
    searchDescription,
    includeDescription,
  ]
    .filter(Boolean)
    .join('\n\n');

  const op: Record<string, unknown> = {
    tags: [tag(entry)],
    summary: `List ${entry.name.toLowerCase()}`,
    description,
    operationId: `list${entry.name.replace(/\s/g, '')}`,
    parameters: [
      { $ref: '#/components/parameters/PageParam' },
      { $ref: '#/components/parameters/LimitParam' },
      { $ref: '#/components/parameters/SearchParam' },
      { $ref: '#/components/parameters/SortParam' },
      { $ref: '#/components/parameters/OrderParam' },
      { $ref: '#/components/parameters/IncludeParam' },
    ],
    responses: {
      '200': successResponseWithMeta,
      '401': unauthorizedResponse,
      '403': forbiddenResponse,
      '500': serverErrorResponse,
    },
  };

  return op;
}

function buildCreatePath(entry: RouteRegistryEntry) {
  const op: Record<string, unknown> = {
    tags: [tag(entry)],
    summary: `Create ${entry.name.toLowerCase().replace(/s$/, '')}`,
    operationId: `create${entry.name.replace(/\s/g, '').replace(/s$/, '')}`,
    responses: {
      '200': successResponse,
      '401': unauthorizedResponse,
      '403': forbiddenResponse,
      '422': validationErrorResponse,
      '500': serverErrorResponse,
    },
  };

  if (entry.createSchema) {
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: zodToOpenApiSchema(entry.createSchema),
        },
      },
    };
  } else {
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
    };
  }

  return op;
}

function buildGetOnePath(entry: RouteRegistryEntry) {
  return {
    tags: [tag(entry)],
    summary: `Get ${entry.name.toLowerCase().replace(/s$/, '')} by ID`,
    operationId: `get${entry.name.replace(/\s/g, '').replace(/s$/, '')}`,
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Record ID (CUID)',
        schema: { type: 'string' },
      },
      { $ref: '#/components/parameters/IncludeParam' },
    ],
    responses: {
      '200': successResponse,
      '401': unauthorizedResponse,
      '403': forbiddenResponse,
      '404': notFoundResponse,
      '500': serverErrorResponse,
    },
  };
}

function buildUpdatePath(entry: RouteRegistryEntry) {
  const op: Record<string, unknown> = {
    tags: [tag(entry)],
    summary: `Update ${entry.name.toLowerCase().replace(/s$/, '')}`,
    operationId: `update${entry.name.replace(/\s/g, '').replace(/s$/, '')}`,
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Record ID (CUID)',
        schema: { type: 'string' },
      },
    ],
    responses: {
      '200': successResponse,
      '401': unauthorizedResponse,
      '403': forbiddenResponse,
      '404': notFoundResponse,
      '422': validationErrorResponse,
      '500': serverErrorResponse,
    },
  };

  if (entry.updateSchema) {
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: zodToOpenApiSchema(entry.updateSchema),
        },
      },
    };
  } else {
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
    };
  }

  return op;
}

function buildDeletePath(entry: RouteRegistryEntry) {
  return {
    tags: [tag(entry)],
    summary: `Delete ${entry.name.toLowerCase().replace(/s$/, '')}`,
    operationId: `delete${entry.name.replace(/\s/g, '').replace(/s$/, '')}`,
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Record ID (CUID)',
        schema: { type: 'string' },
      },
    ],
    responses: {
      '200': deleteSuccessResponse,
      '401': unauthorizedResponse,
      '403': forbiddenResponse,
      '404': notFoundResponse,
      '500': serverErrorResponse,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Main generator                                                             */
/* -------------------------------------------------------------------------- */

export function generateOpenApiSpec() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const entry of routeRegistry) {
    const collectionPath = `/${entry.path}`;
    const singlePath = `/${entry.path}/{id}`;

    // Collection operations (GET list + optional POST)
    const collectionOps: Record<string, unknown> = {
      get: buildListPath(entry),
    };
    if (!entry.readOnly) {
      collectionOps.post = buildCreatePath(entry);
    }
    paths[collectionPath] = collectionOps;

    // Single-record operations (GET one + optional PUT/DELETE)
    const singleOps: Record<string, unknown> = {
      get: buildGetOnePath(entry),
    };
    if (!entry.readOnly) {
      singleOps.put = buildUpdatePath(entry);
      singleOps.delete = buildDeletePath(entry);
    }
    paths[singlePath] = singleOps;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Daily Baker API',
      version: '1.0.0',
      description:
        'REST API for the Daily Baker bakery management platform. ' +
        'Provides CRUD access to recipes, ingredients, inventory, production sheets, ' +
        'equipment, vendors, tags, and more. All bakery-scoped endpoints automatically ' +
        'filter by the authenticated user\'s bakery.',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    security: [{ BearerAuth: [] }],
    tags: routeRegistry.map((entry) => ({
      name: tag(entry),
      description: entry.adminOnly
        ? `${entry.name} management (platform admin only)`
        : `${entry.name} management`,
    })),
    paths,
    components: buildComponents(),
  };
}
