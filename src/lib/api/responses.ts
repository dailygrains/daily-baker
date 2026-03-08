import { NextResponse } from 'next/server';

export function apiSuccess(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) });
}

export function apiError(message: string, status: number, details?: unknown) {
  const body: Record<string, unknown> = { success: false, error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function api401() {
  return apiError('Unauthorized', 401);
}

export function api403(message = 'Forbidden') {
  return apiError(message, 403);
}

export function api404(entity = 'Resource') {
  return apiError(`${entity} not found`, 404);
}

export function api422(details: unknown) {
  return apiError('Validation failed', 422, details);
}
