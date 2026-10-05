import { ServiceError, type ServiceContext } from './context';

/**
 * Platform-admin gate for the admin services, keeping the dashboard's
 * per-action wording ("...can create roles").
 */
export function requireAdmin(ctx: ServiceContext, action: string) {
  if (!ctx.isPlatformAdmin) {
    throw new ServiceError(403, `Unauthorized: Only platform administrators can ${action}`);
  }
}

/** True when a Prisma error is a foreign key violation (P2003). */
export function isForeignKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2003'
  );
}
