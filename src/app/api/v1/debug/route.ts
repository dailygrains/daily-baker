import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const prefix = token ? token.slice(0, 12) : null;

  let dbInfo: Record<string, unknown> = {};
  try {
    const totalKeys = await db.apiKey.count();
    const allPrefixes = await db.apiKey.findMany({
      select: { prefix: true, name: true, revokedAt: true },
    });
    const matchByPrefix = prefix
      ? await db.apiKey.findFirst({ where: { prefix, revokedAt: null } })
      : null;

    dbInfo = {
      totalKeys,
      allPrefixes: allPrefixes.map((k) => ({
        prefix: k.prefix,
        name: k.name,
        revoked: !!k.revokedAt,
      })),
      searchedPrefix: prefix,
      matchFound: !!matchByPrefix,
      matchName: matchByPrefix?.name ?? null,
    };
  } catch (err) {
    dbInfo = { error: String(err) };
  }

  return NextResponse.json({
    hasAuthHeader: !!authHeader,
    tokenPrefix: prefix,
    db: dbInfo,
  });
}
