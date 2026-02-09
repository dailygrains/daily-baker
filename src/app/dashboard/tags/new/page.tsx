import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { TagForm } from '@/components/tags/TagForm';
import { getTagTypesByBakery } from '@/app/actions/tag';
import Link from 'next/link';
import { FolderTree, Plus } from 'lucide-react';

export default async function NewTagPage({
  searchParams,
}: {
  searchParams: Promise<{ tagTypeId?: string }>;
}) {
  const user = await getCurrentUser();
  const { tagTypeId } = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const tagTypesResult = await getTagTypesByBakery(user.bakeryId);

  if (!tagTypesResult.success) {
    return (
      <div className="alert alert-error">
        <span>{tagTypesResult.error}</span>
      </div>
    );
  }

  const tagTypes = tagTypesResult.data || [];

  // If no tag types exist, show a message to create one first
  if (tagTypes.length === 0) {
    return (
      <>
        <SetPageHeader
          title="Add New Tag"
          breadcrumbs={[
            { label: 'Tags', href: '/dashboard/tags' },
            { label: 'New Tag' },
          ]}
        />

        <div className="text-center py-12">
          <FolderTree className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-2xl font-bold mb-2">No tag types available</h3>
          <p className="text-base-content/70 mb-6">
            You need to create a tag type before you can create tags
          </p>
          <Link href="/dashboard/tag-types/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Create Tag Type First
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SetPageHeader
        title="Add New Tag"
        breadcrumbs={[
          { label: 'Tags', href: '/dashboard/tags' },
          { label: 'New Tag' },
        ]}
      />

      <TagForm
        bakeryId={user.bakeryId}
        tagTypes={tagTypes}
        defaultTagTypeId={tagTypeId}
      />
    </>
  );
}
