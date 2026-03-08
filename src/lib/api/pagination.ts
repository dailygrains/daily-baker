import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  search: string | null;
  sort: string;
  order: 'asc' | 'desc';
  include: string[];
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export function parsePagination(req: NextRequest): PaginationParams {
  const params = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get('limit') || String(DEFAULT_LIMIT))));
  const search = params.get('search') || null;
  const sort = params.get('sort') || 'createdAt';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const include = params.get('include')?.split(',').filter(Boolean) || [];

  return { page, limit, skip: (page - 1) * limit, search, sort, order, include };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
