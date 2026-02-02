import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { getBakeryById } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        actions={
          <Link href={`/admin/bakeries/${id}/roles`} className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Roles
          </Link>
        }
      />

      <RoleForm bakery={bakery} mode="create" />
    </>
  );
}
