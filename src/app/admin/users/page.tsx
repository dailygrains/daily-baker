import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getAllUsers } from '@/app/actions/user';
import { Users } from 'lucide-react';
import { UsersTable } from '@/components/user/UsersTable';

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const result = await getAllUsers();

  if (!result.success) {
    return (
      
      <>
        <SetPageHeader
          title="Users"
          description="Manage all users on the platform"
        />
        <div className="alert alert-error">
          <span>{result.error}</span>
        </div>
      </>
    );
  }

  const users = result.data || [];

  return (
    
      <>
        <SetPageHeader
        title="Users"
        sticky
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Users will appear here once they sign up."
        />
      ) : (
        <UsersTable users={users} currentUserId={user.id!} />
      )}
    </>
  );
}
