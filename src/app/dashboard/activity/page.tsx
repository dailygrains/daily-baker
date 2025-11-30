import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActivityLogTable } from '@/components/activity/ActivityLogTable';
import { getActivityLogs } from '@/app/actions/activity-log';
import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';

export default async function BakeryActivityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Platform admins should use the admin activity page
  if (user.isPlatformAdmin) {
    redirect('/admin/activity');
  }

  if (!user.bakery) {
    return (
      <DashboardLayout
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <PageHeader
          title="Activity"
          description="Recent bakery activity"
        />

        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="font-bold">No Bakery Assigned</h3>
            <div className="text-sm">
              You must be assigned to a bakery to view activity.
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const logsResult = await getActivityLogs({ limit: 100 });

  if (!logsResult.success) {
    return (
      <DashboardLayout
        bakeryName={user.bakery.name}
        userRole={user.role?.name}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <PageHeader
          title="Activity"
          description="Recent bakery activity"
        />
        <div className="alert alert-error">
          <span>{logsResult.error || 'Failed to load activity logs'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const { logs, total } = logsResult.data!;

  return (
    <DashboardLayout
      bakeryName={user.bakery.name}
      userRole={user.role?.name}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      <PageHeader
        title="Activity"
        description={`Recent activity at ${user.bakery.name}`}
      />

      <div className="stats stats-vertical lg:stats-horizontal shadow mb-6 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Activities</div>
          <div className="stat-value text-primary">{total}</div>
          <div className="stat-desc">All time</div>
        </div>

        <div className="stat">
          <div className="stat-title">Recent Activity</div>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-desc">Last 100 activities</div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
          <ActivityLogTable logs={logs} showBakery={false} />
        </div>
      </div>
    </DashboardLayout>
  );
}
