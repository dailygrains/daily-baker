import { getCurrentUser } from '@/lib/clerk';
import { redirect, notFound } from 'next/navigation';
import { TagTypeEditPageContent } from '@/components/tag-types/TagTypeEditPageContent';
import { getTagTypeById } from '@/app/actions/tag';

export default async function EditTagTypePage({
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

  const tagTypeResult = await getTagTypeById(id);

  if (!tagTypeResult.success || !tagTypeResult.data) {
    notFound();
  }

  const tagType = tagTypeResult.data;

  return (
    <TagTypeEditPageContent
      bakeryId={user.bakeryId}
      tagType={tagType}
    />
  );
}
