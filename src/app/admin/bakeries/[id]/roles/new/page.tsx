import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { getBakeryById } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';

export default async function NewRolePage({
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
  const bakeryResult = await getBakeryById(id);

  if (!bakeryResult.success || !bakeryResult.data) {
    return (
      
      <>
        <SetPageHeader title="Create Role" />
        <div className="alert alert-error">
          <span>{bakeryResult.error || 'Bakery not found'}</span>
        </div>
      </>
    );
  }

  const bakery = bakeryResult.data;

  return (
    
      <>
        <SetPageHeader
        title="Create Platform Role"
        description="Define a new platform-wide role with specific permissions"
        breadcrumbs={[
          { label: 'Bakeries', href: '/admin/bakeries' },
          { label: bakery.name, href: `/admin/bakeries/${id}/roles` },
          { label: 'New Role' },
        ]}
      />

      <RoleForm bakery={bakery} mode="create" />
    </>
  );
}
