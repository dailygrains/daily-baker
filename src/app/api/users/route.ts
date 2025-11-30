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

    // Search users by name or email
    const users = await db.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        bakeries: {
          select: {
            bakeryId: true,
          },
          take: 1, // Only need first bakery for display
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
    });

    // Transform data to flatten bakery structure and fetch only needed bakery names
    const bakeryIds = [...new Set(users.map(u => u.bakeries[0]?.bakeryId).filter(Boolean))];
    const bakeries = bakeryIds.length > 0
      ? await db.bakery.findMany({
          where: { id: { in: bakeryIds } },
          select: { id: true, name: true },
        })
      : [];

    const bakeryMap = new Map(bakeries.map(b => [b.id, b]));

    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      bakery: user.bakeries[0]?.bakeryId
        ? bakeryMap.get(user.bakeries[0].bakeryId) || null
        : null,
      role: user.role,
    }));

    return NextResponse.json({
      success: true,
      data: transformedUsers,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
