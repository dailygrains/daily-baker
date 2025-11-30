import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { MobileMenuButton } from '@/components/layout/MobileMenuButton';
import { ToastContainer } from '@/components/ui/ToastContainer';
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
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main Content */}
      <div className="drawer-content flex flex-col">
        {/* Mobile Menu Button */}
        <MobileMenuButton />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 bg-base-200">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <DashboardSidebar
        userName={user.name || undefined}
        userEmail={user.email}
        userRole={user.role?.name}
        isPlatformAdmin={true}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
