import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { redirect } from 'next/navigation';
import { getBakeryById } from '@/app/actions/bakery';
import { BakeryForm } from '@/components/bakery/BakeryForm';
import Link from 'next/link';

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

        <div className="divider mt-10" />

        <div className="space-y-0">
          <h2 className="text-xl font-semibold">Developer</h2>

          <Link
            href="/dashboard/settings/api-keys"
            className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer mt-4"
          >
            <div className="card-body flex-row items-center gap-4 py-4">
              <div className="flex-1">
                <h3 className="card-title text-base">API Keys</h3>
                <p className="text-sm text-base-content/60">
                  Manage API keys for programmatic access to your bakery data
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
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

      <div className="divider mt-10" />

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Developer</h2>

        <Link
          href="/dashboard/settings/api-keys"
          className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer mt-4"
        >
          <div className="card-body flex-row items-center gap-4 py-4">
            <div className="flex-1">
              <h3 className="card-title text-base">API Keys</h3>
              <p className="text-sm text-base-content/60">
                Manage API keys for programmatic access to your bakery data
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </>
  );
}
