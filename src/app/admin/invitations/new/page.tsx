import { getCurrentUser } from '@/lib/clerk';
import { InvitationNewPageContent } from '@/components/invitation/InvitationNewPageContent';
import { getAllBakeries } from '@/app/actions/bakery';
import { getAllRoles } from '@/app/actions/user';
import { redirect } from 'next/navigation';

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

  return <InvitationNewPageContent bakeries={bakeries} roles={roles} />;
}
