import { getCurrentUser } from '@/lib/clerk';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserEditPageContent } from '@/components/user/UserEditPageContent';
import { getUserById, getAllRoles } from '@/app/actions/user';
import { getAllBakeries } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (!currentUser.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;

  const [userResult, bakeriesResult, rolesResult] = await Promise.all([
    getUserById(id),
    getAllBakeries(),
    getAllRoles(),
  ]);

  if (!userResult.success || !userResult.data) {
    return (
      
      <>
        <PageHeader title="Edit User" />
        <div className="alert alert-error">
          <span>{userResult.error || 'User not found'}</span>
        </div>
      </>
    );
  }

  const user = userResult.data;
  const bakeries = bakeriesResult.success ? bakeriesResult.data || [] : [];
  const roles = rolesResult.success ? rolesResult.data || [] : [];

  return (
    <UserEditPageContent
      user={user}
      bakeries={bakeries}
      roles={roles}
    />
  );
}
