import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { redirect } from 'next/navigation';

export default async function NewRolePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    
      <>
        <SetPageHeader
        title="Create Platform Role"
        description="Define a new platform-wide role with specific permissions"
        breadcrumbs={[
          { label: 'Roles', href: '/admin/roles' },
          { label: 'New' },
        ]}
      />

      <RoleForm mode="create" />
    </>
  );
}
