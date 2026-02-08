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
    const tagTypeId = searchParams.get('tagTypeId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludeIds = searchParams.get('excludeIds')?.split(',').filter(Boolean) || [];

    if (!bakeryId) {
      return NextResponse.json(
        { success: false, error: 'Bakery ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this bakery
    const hasAccess = user.isPlatformAdmin || user.bakeryId === bakeryId;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Search tags by name
    const tags = await db.tag.findMany({
      where: {
        bakeryId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
        ...(tagTypeId && { tagTypeId }),
        ...(excludeIds.length > 0 && {
          id: { notIn: excludeIds },
        }),
      },
      select: {
        id: true,
        name: true,
        color: true,
        tagType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { tagType: { order: 'asc' } },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error) {
    console.error('Error searching tags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search tags' },
      { status: 500 }
    );
  }
}
