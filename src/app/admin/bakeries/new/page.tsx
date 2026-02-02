import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { BakeryForm } from '@/components/bakery/BakeryForm';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewBakeryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    
      <>
        <SetPageHeader
        title="Create New Bakery"
        description="Add a new bakery to the platform"
        actions={
          <Link href="/admin/bakeries" className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Bakeries
          </Link>
        }
      />

      <BakeryForm mode="create" />
    </>
  );
}
