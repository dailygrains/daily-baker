import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { listApiKeys } from '@/app/actions/apiKey';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';

export default async function ApiKeysPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard/settings');
  }

  const result = await listApiKeys(user.bakeryId);
  const initialKeys = result.success && result.data
    ? result.data.map((key) => ({
        ...key,
        scopes: key.scopes as string[],
      }))
    : [];

  return (
    <ApiKeyManager bakeryId={user.bakeryId} initialKeys={initialKeys} />
  );
}
