import { getCurrentUser } from '@/lib/clerk';
import { redirect, notFound } from 'next/navigation';
import { TagEditPageContent } from '@/components/tags/TagEditPageContent';
import { getTagById, getTagTypesByBakery } from '@/app/actions/tag';

export default async function EditTagPage({
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

  const [tagResult, tagTypesResult] = await Promise.all([
    getTagById(id),
    getTagTypesByBakery(user.bakeryId),
  ]);

  if (!tagResult.success || !tagResult.data) {
    notFound();
  }

  if (!tagTypesResult.success) {
    return (
      <div className="alert alert-error">
        <span>{tagTypesResult.error}</span>
      </div>
    );
  }

  const tag = tagResult.data;
  const tagTypes = tagTypesResult.data || [];

  return (
    <TagEditPageContent
      bakeryId={user.bakeryId}
      tagTypes={tagTypes}
      tag={tag}
    />
  );
}
