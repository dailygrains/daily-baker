import { NextRequest } from 'next/server';
import type { ServiceContext } from '@/lib/services/context';
import { resolveApiAuth, hasScope } from './auth';
import { apiErrorResponse, serviceContext } from './create-crud-routes';
import { apiSuccess, apiError, api401, api403 } from './responses';

type RouteParams = { params: Promise<Record<string, string>> };

/**
 * Build a route handler for an action endpoint (anything beyond plain CRUD,
 * e.g. POST /products/:id/recalculate) that calls a shared service function.
 * Handles auth, scope, the bakery requirement, JSON parsing and error mapping.
 */
export function serviceHandler(
  scope: 'read' | 'write',
  label: string,
  fn: (ctx: ServiceContext, args: { params: Record<string, string>; body: Record<string, unknown> }) => Promise<unknown>
) {
  return async (req: NextRequest, { params }: RouteParams) => {
    try {
      const auth = await resolveApiAuth(req);
      if (!auth) return api401();
      if (!hasScope(auth, scope)) return api403('Insufficient scope');

      let body: Record<string, unknown> = {};
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          return apiError('Invalid JSON body', 400);
        }
      }

      return apiSuccess(await fn(serviceContext(auth), { params: await params, body }));
    } catch (error) {
      return apiErrorResponse(error, label);
    }
  };
}
