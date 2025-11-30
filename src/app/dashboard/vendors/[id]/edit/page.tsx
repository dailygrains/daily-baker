import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { VendorForm } from '@/components/vendors/VendorForm';
import { getVendorById } from '@/app/actions/vendor';

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const vendorResult = await getVendorById(id);

  if (!vendorResult.success || !vendorResult.data) {
    redirect('/dashboard/vendors');
  }

  const vendor = vendorResult.data;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Edit Vendor"
          description={`Update details for ${vendor.name}`}
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <VendorForm bakeryId={user.bakeryId} vendor={vendor} />
          </div>
        </div>
      </div>
  );
}
