import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  return NextResponse.json({
    hasAuthHeader: !!authHeader,
    authHeaderPreview: authHeader ? authHeader.slice(0, 25) + '...' : null,
    startsWithBearer: authHeader?.startsWith('Bearer ') ?? false,
    tokenPrefix: authHeader ? authHeader.slice(7, 19) : null,
  });
}
