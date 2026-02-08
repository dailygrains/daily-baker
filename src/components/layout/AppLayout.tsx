import { ReactNode } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { UnifiedHeader } from './UnifiedHeader';
import { ToastContainer } from '../ui/ToastContainer';

interface AppLayoutProps {
  children: ReactNode;
  userName?: string;
  userEmail: string;
  userRole?: string;
  isPlatformAdmin: boolean;
  bakeries: Array<{ id: string; name: string }>;
  currentBakeryId: string | undefined;
}

export function AppLayout({
  children,
  userName,
  userEmail,
  userRole,
  isPlatformAdmin,
  bakeries,
  currentBakeryId,
}: AppLayoutProps) {
  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main Content */}
      <div className="drawer-content flex flex-col">
        {/* Unified Header with sidebar toggle and page content */}
        <UnifiedHeader />

        {/* Page Content */}
        <main className="flex-1 p-8 lg:p-12 bg-base-200">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-10 is-drawer-close:z-50 is-drawer-close:overflow-visible">
        <label htmlFor="sidebar-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <DashboardSidebar
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          isPlatformAdmin={isPlatformAdmin}
          bakeries={bakeries}
          currentBakeryId={currentBakeryId}
        />
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
