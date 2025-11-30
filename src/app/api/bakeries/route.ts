import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Search bakeries by name
    const bakeries = await db.bakery.findMany({
      where: search
        ? {
            name: { contains: search, mode: 'insensitive' },
            isActive: true,
          }
        : {
            isActive: true,
          },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: bakeries,
    });
  } catch (error) {
    console.error('Error searching bakeries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search bakeries' },
      { status: 500 }
    );
  }
}
