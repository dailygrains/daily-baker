import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Only platform admins can access admin routes
  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    <AppLayout
      userName={user.name || undefined}
      userEmail={user.email ?? ''}
      userRole={user.role?.name}
      isPlatformAdmin={true}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      {children}
    </AppLayout>
  );
}
