import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const bakery = await db.bakery.findUnique({
      where: { id },
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
    });

    if (!bakery) {
      return NextResponse.json(
        { success: false, error: 'Bakery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bakery,
    });
  } catch (error) {
    console.error('Error fetching bakery:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bakery' },
      { status: 500 }
    );
  }
}
