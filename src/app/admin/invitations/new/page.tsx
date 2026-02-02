import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { InvitationForm } from '@/components/invitation/InvitationForm';
import { getAllBakeries } from '@/app/actions/bakery';
import { getAllRoles } from '@/app/actions/user';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewInvitationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const [bakeriesResult, rolesResult] = await Promise.all([
    getAllBakeries(),
    getAllRoles(),
  ]);

  const bakeries = bakeriesResult.success ? bakeriesResult.data || [] : [];
  const roles = rolesResult.success ? rolesResult.data || [] : [];

  return (
    
      <>
        <SetPageHeader
        title="Send Invitation"
        description="Invite a new user to the platform"
        actions={
          <Link href="/admin/invitations" className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Invitations
          </Link>
        }
      />

      <InvitationForm bakeries={bakeries} roles={roles} />

      <div className="mt-6">
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h3 className="font-bold">About Invitations</h3>
            <div className="text-sm">
              <p className="mt-1">Invitations are valid for 7 days. You can optionally pre-assign the user to a bakery and role.</p>
              <p className="mt-1">After creating the invitation, you&apos;ll be able to copy the invitation link to share with the user.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
