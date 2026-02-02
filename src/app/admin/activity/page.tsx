import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ActivityLogTable } from '@/components/activity/ActivityLogTable';
import { getActivityLogs } from '@/app/actions/activity-log';
import { redirect } from 'next/navigation';

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-base-content/70">Total Activities</p>
          <p className="text-2xl font-bold text-primary">{total}</p>
        </div>
        <div>
          <p className="text-sm text-base-content/70">Recent Activity</p>
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-sm text-base-content/60">Last 100 activities</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <ActivityLogTable logs={logs} showBakery={true} />
      </section>
    </>
  );
}
