import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { getRoleById } from '@/app/actions/role';
import { getBakeryById } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string; roleId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const { id, roleId } = await params;
  const [roleResult, bakeryResult] = await Promise.all([
    getRoleById(roleId),
    getBakeryById(id),
  ]);

  if (!roleResult.success || !roleResult.data) {
    return (
      
      <>
        <SetPageHeader title="Edit Role" />
        <div className="alert alert-error">
          <span>{roleResult.error || 'Role not found'}</span>
        </div>
      </>
    );
  }

  if (!bakeryResult.success || !bakeryResult.data) {
    return (
      
      <>
        <SetPageHeader title="Edit Role" />
        <div className="alert alert-error">
          <span>{bakeryResult.error || 'Bakery not found'}</span>
        </div>
      </>
    );
  }

  const role = roleResult.data;
  const bakery = bakeryResult.data;

  return (
    
      <>
        <SetPageHeader
        title={`Edit Platform Role: ${role.name}`}
        description="Update platform-wide role details and permissions"
        actions={
          <Link href={`/admin/bakeries/${id}/roles`} className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Roles
          </Link>
        }
      />

      <RoleForm role={role} bakery={bakery} mode="edit" />
    </>
  );
}
