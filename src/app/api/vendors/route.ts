import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const bakeryId = searchParams.get('bakeryId');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludeIds = searchParams.get('excludeIds')?.split(',') || [];

    if (!bakeryId) {
      return NextResponse.json(
        { success: false, error: 'Bakery ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this bakery (the bakeryId we received in the request)
    const hasAccess = user.isPlatformAdmin || user.bakeryId === bakeryId;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Search vendors by name
    const vendors = await db.vendor.findMany({
      where: {
        bakeryId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
        ...(excludeIds.length > 0 && {
          id: { notIn: excludeIds },
        }),
      },
      select: {
        id: true,
        name: true,
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      vendors,
    });
  } catch (error) {
    console.error('Error searching vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search vendors' },
      { status: 500 }
    );
  }
}
