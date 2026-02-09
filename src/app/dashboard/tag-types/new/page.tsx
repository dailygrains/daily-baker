import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { TagTypeNewPageContent } from '@/components/tag-types/TagTypeNewPageContent';

export default async function NewTagTypePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  return <TagTypeNewPageContent bakeryId={user.bakeryId} />;
}
