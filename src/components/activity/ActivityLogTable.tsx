'use client';

import { ActivityType } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  action: ActivityType;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  description: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  bakery: {
    id: string;
    name: string;
  } | null;
}

interface ActivityLogTableProps {
  logs: ActivityLog[];
  showBakery?: boolean;
}

const ACTION_COLORS: Record<ActivityType, string> = {
  CREATE: 'badge-success',
  UPDATE: 'badge-info',
  DELETE: 'badge-error',
  INVITE: 'badge-primary',
  ASSIGN: 'badge-warning',
  REVOKE: 'badge-error',
  LOGIN: 'badge-ghost',
  LOGOUT: 'badge-ghost',
};

const ACTION_LABELS: Record<ActivityType, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  INVITE: 'Invited',
  ASSIGN: 'Assigned',
  REVOKE: 'Revoked',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
};

export function ActivityLogTable({ logs, showBakery = false }: ActivityLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60">No activity logs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Description</th>
            <th>User</th>
            {showBakery && <th>Bakery</th>}
            <th>Entity</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>
                <span className={`badge ${ACTION_COLORS[log.action]} badge-sm`}>
                  {ACTION_LABELS[log.action]}
                </span>
              </td>
              <td className="max-w-md">
                <p className="text-sm">{log.description}</p>
              </td>
              <td>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {log.user.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-base-content/60">
                    {log.user.email}
                  </span>
                </div>
              </td>
              {showBakery && (
                <td>
                  {log.bakery ? (
                    <span className="text-sm">{log.bakery.name}</span>
                  ) : (
                    <span className="text-xs text-base-content/40 italic">
                      Platform-wide
                    </span>
                  )}
                </td>
              )}
              <td>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {log.entityType}
                  </span>
                  {log.entityName && (
                    <span className="text-xs text-base-content/60">
                      {log.entityName}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <span className="text-xs text-base-content/60">
                  {formatDistanceToNow(new Date(log.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
