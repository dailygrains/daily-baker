import { getCurrentUser } from '@/lib/clerk';
import { getBakeryById } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { BakeryEditPageContent } from '@/components/bakery/BakeryEditPageContent';
import { SetPageHeader } from '@/components/layout/SetPageHeader';

export default async function EditBakeryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const result = await getBakeryById(id);

  if (!result.success || !result.data) {
    return (
      
      <>
        <SetPageHeader title="Edit Bakery" />
        <div className="alert alert-error">
          <span>{result.error || 'Bakery not found'}</span>
        </div>
      </>
    );
  }

  const bakery = result.data;

  return (
    <BakeryEditPageContent bakery={bakery} />
  );
}
