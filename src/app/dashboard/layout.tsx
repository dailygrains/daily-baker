import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <AppLayout
      userName={user.name || undefined}
      userEmail={user.email ?? ''}
      userRole={user.role?.name}
      isPlatformAdmin={user.isPlatformAdmin ?? false}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      {children}
    </AppLayout>
  );
}
