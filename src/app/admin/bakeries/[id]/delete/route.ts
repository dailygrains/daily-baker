import { deleteBakery } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteBakery(id);
  redirect('/admin/bakeries');
}
