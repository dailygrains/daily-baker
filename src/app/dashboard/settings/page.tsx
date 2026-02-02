import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { redirect } from 'next/navigation';
import { getBakeryById } from '@/app/actions/bakery';
import { BakeryForm } from '@/components/bakery/BakeryForm';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Platform admins have different settings
  if (user.isPlatformAdmin) {
    return (
      <>
        <SetPageHeader
          title="Platform Settings"
          description="Configure platform-wide settings"
        />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Platform Configuration</h2>
          <p className="text-base-content/60">
            Platform administration features coming soon.
          </p>
        </section>
      </>
    );
  }

  // Regular users must be assigned to a bakery
  if (!user.bakery) {
    return (
      
      <>
        <SetPageHeader
          title="Settings"
          description="Configure your bakery settings"
        />

        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="font-bold">No Bakery Assigned</h3>
            <div className="text-sm">You must be assigned to a bakery to access settings.</div>
          </div>
        </div>
      </>
    );
  }

  const bakeryResult = await getBakeryById(user.bakery.id);

  if (!bakeryResult.success || !bakeryResult.data) {
    return (
      
      <>
        <SetPageHeader
          title="Settings"
          description="Configure your bakery settings"
        />
        <div className="alert alert-error">
          <span>{bakeryResult.error || 'Failed to load bakery settings'}</span>
        </div>
      </>
    );
  }

  const bakery = bakeryResult.data;

  return (
    
      <>
        <SetPageHeader
        title="Bakery Settings"
        description="Update your bakery information and preferences"
      />

      <div className="alert alert-info mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <h3 className="font-bold">Bakery Information</h3>
          <div className="text-sm">Update your bakery&apos;s contact information and details</div>
        </div>
      </div>

      <BakeryForm bakery={bakery} mode="edit" redirectPath="/dashboard/settings" />
    </>
  );
}
