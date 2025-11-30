import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewRolePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout
      userName={user.name || undefined}
      userEmail={user.email}
      isPlatformAdmin={true}
    >
      <PageHeader
        title="Create Platform Role"
        description="Define a new platform-wide role with specific permissions"
        actions={
          <Link href="/admin/roles" className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Roles
          </Link>
        }
      />

      <RoleForm mode="create" />
    </DashboardLayout>
  );
}
