import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getAllInvitations, revokeInvitation } from '@/app/actions/invitation';
import { Mail, Plus, Copy, X, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default async function InvitationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const result = await getAllInvitations();

  if (!result.success) {
    return (
      <DashboardLayout isPlatformAdmin={true}>
        <PageHeader
          title="Invitations"
          description="Manage user invitations"
        />
        <div className="alert alert-error">
          <span>{result.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const invitations = result.data || [];
  const pendingInvitations = invitations.filter((inv) => inv.status === 'PENDING');
  const acceptedInvitations = invitations.filter((inv) => inv.status === 'ACCEPTED');
  const expiredInvitations = invitations.filter((inv) =>
    inv.status === 'PENDING' && new Date(inv.expiresAt) < new Date()
  );

  function getInvitationUrl(token: string) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/accept-invitation?token=${token}`;
    }
    return `/accept-invitation?token=${token}`;
  }

  async function copyInvitationLink(token: string) {
    if (typeof window !== 'undefined') {
      const url = getInvitationUrl(token);
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <DashboardLayout isPlatformAdmin={true}>
      <PageHeader
        title="Invitations"
        description="Manage user invitations to the platform"
        actions={
          <Link href="/admin/invitations/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Send Invitation
          </Link>
        }
      />

      <div className="stats shadow bg-base-100 mb-6">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Clock className="h-8 w-8" />
          </div>
          <div className="stat-title">Pending</div>
          <div className="stat-value text-primary">{pendingInvitations.length}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="stat-title">Accepted</div>
          <div className="stat-value text-success">{acceptedInvitations.length}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <XCircle className="h-8 w-8" />
          </div>
          <div className="stat-title">Expired</div>
          <div className="stat-value text-warning">{expiredInvitations.length}</div>
        </div>
      </div>

      {invitations.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No invitations yet"
          description="Send your first invitation to invite users to the platform."
          action={
            <Link href="/admin/invitations/new" className="btn btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Send First Invitation
            </Link>
          }
        />
      ) : (
        <div className="card bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Bakery</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Invited By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expiresAt) < new Date();
                  const statusColor =
                    invitation.status === 'ACCEPTED' ? 'success' :
                    invitation.status === 'REVOKED' ? 'error' :
                    isExpired ? 'warning' : 'info';

                  return (
                    <tr key={invitation.id} className="hover">
                      <td>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-base-content/40" />
                          <span className="font-medium">{invitation.email}</span>
                        </div>
                      </td>
                      <td>
                        {invitation.bakery ? (
                          <span>{invitation.bakery.name}</span>
                        ) : (
                          <span className="text-base-content/40 italic">No bakery</span>
                        )}
                      </td>
                      <td>
                        {invitation.role ? (
                          <span className="badge badge-outline">{invitation.role.name}</span>
                        ) : (
                          <span className="text-base-content/40 italic">No role</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${statusColor}`}>
                          {isExpired && invitation.status === 'PENDING' ? 'Expired' : invitation.status}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {invitation.creator.name || invitation.creator.email}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          {invitation.status === 'PENDING' && !isExpired && (
                            <>
                              <button
                                onClick={() => copyInvitationLink(invitation.token)}
                                className="btn btn-sm btn-ghost"
                                title="Copy invitation link"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <form action={revokeInvitation.bind(null, invitation.id)}>
                                <button
                                  type="submit"
                                  className="btn btn-sm btn-ghost text-error"
                                  title="Revoke invitation"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
