import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { TagTypeForm } from '@/components/tag-types/TagTypeForm';

export default async function NewTagTypePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  return (
    <>
      <SetPageHeader
        title="Add New Tag Type"
        breadcrumbs={[
          { label: 'Tag Types', href: '/dashboard/tag-types' },
          { label: 'New Tag Type' },
        ]}
      />

      <TagTypeForm bakeryId={user.bakeryId} />
    </>
  );
}
