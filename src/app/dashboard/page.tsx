import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Package,
  AlertCircle,
  Calendar
} from 'lucide-react';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Platform admins see platform-wide dashboard
  if (user.isPlatformAdmin) {
    return (
      <DashboardLayout
        isPlatformAdmin={true}
      >
        <PageHeader
          title="Platform Dashboard"
          description="Overview of all bakeries on Daily Baker"
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Bakeries */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-primary">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Bakeries</div>
              <div className="stat-value text-primary">3</div>
              <div className="stat-desc">Active bakeries</div>
            </div>
          </div>

          {/* Total Users */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-secondary">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Users</div>
              <div className="stat-value text-secondary">5</div>
              <div className="stat-desc">Platform-wide</div>
            </div>
          </div>

          {/* Active Bake Sheets */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-accent">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="stat-title">Active Bake Sheets</div>
              <div className="stat-value text-accent">2</div>
              <div className="stat-desc">In progress today</div>
            </div>
          </div>

          {/* System Health */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-success">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div className="stat-title">System Status</div>
              <div className="stat-value text-sm text-success">All Systems Operational</div>
              <div className="stat-desc">No issues detected</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <h3 className="font-bold">Platform Admin Mode</h3>
              <div className="text-sm">You have access to all bakeries and users. Use the sidebar to navigate platform admin features.</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Regular users must be assigned to a bakery
  if (!user.bakery) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Welcome to Daily Baker"
          description="You're not currently assigned to a bakery"
        />

        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="font-bold">No Bakery Assigned</h3>
            <div className="text-sm">Please contact a platform administrator to assign you to a bakery.</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Bakery user dashboard
  return (
    <DashboardLayout
      bakeryName={user.bakery.name}
      userRole={user.role?.name}
    >
      <PageHeader
        title={`Welcome back, ${user.name || 'Baker'}!`}
        description={`${user.bakery.name} Dashboard`}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Production */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="stat-title">Today's Bake Sheets</div>
            <div className="stat-value text-primary">1</div>
            <div className="stat-desc">1 in progress</div>
          </div>
        </div>

        {/* Active Recipes */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div className="stat-title">Active Recipes</div>
            <div className="stat-value text-secondary">3</div>
            <div className="stat-desc">Published recipes</div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-warning">
              <Package className="h-8 w-8" />
            </div>
            <div className="stat-title">Low Stock Alerts</div>
            <div className="stat-value text-warning">0</div>
            <div className="stat-desc">All ingredients stocked</div>
          </div>
        </div>

        {/* This Week's Production */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-accent">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div className="stat-title">This Week</div>
            <div className="stat-value text-accent">180</div>
            <div className="stat-desc">Items produced</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a href="/dashboard/bake-sheets" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">View Bake Sheets</h3>
              <p className="text-sm text-base-content/60">See today's production schedule</p>
            </div>
          </a>

          <a href="/dashboard/recipes" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">Browse Recipes</h3>
              <p className="text-sm text-base-content/60">View all bakery recipes</p>
            </div>
          </a>

          <a href="/dashboard/ingredients" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">Check Inventory</h3>
              <p className="text-sm text-base-content/60">Monitor ingredient levels</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity (placeholder) */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="text-center py-8 text-base-content/60">
              <p>Activity log coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
