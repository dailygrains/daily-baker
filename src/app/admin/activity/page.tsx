import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ActivityLogTable } from '@/components/activity/ActivityLogTable';
import { getActivityLogs } from '@/app/actions/activity-log';
import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';

export default async function ActivityLogsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const logsResult = await getActivityLogs({ limit: 100 });

  if (!logsResult.success) {
    return (
      
      <>
        <SetPageHeader
          title="Activity Logs"
          description="Platform-wide activity monitoring"
        />
        <div className="alert alert-error">
          <span>{logsResult.error || 'Failed to load activity logs'}</span>
        </div>
      </>
    );
  }

  const { logs, total } = logsResult.data!;

  return (
    
      <>
        <SetPageHeader
        title="Activity Logs"
        description="Platform-wide activity monitoring"
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
          <ActivityLogTable logs={logs} showBakery={true} />
        </div>
      </div>
    </>
  );
}
