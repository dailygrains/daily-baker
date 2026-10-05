import { asA, ok, unique } from './client';

type Api = ReturnType<typeof asA>;

export async function makeVendor(api: Api = asA(), extra: Record<string, unknown> = {}) {
  return ok<{ id: string; name: string }>(
    await api.post('/vendors', { name: unique('Test mill'), ...extra })
  );
}
