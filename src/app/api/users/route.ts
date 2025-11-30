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
          include: {
            bakery: {
              select: {
                id: true,
                name: true,
              },
            },
          },
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

    // Transform data to include all bakeries for each user
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      bakeries: user.bakeries.map(ub => ub.bakery),
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
