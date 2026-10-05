import { userRoutes } from '@/lib/api/resources/users';

// No POST: users are created by Clerk sign-up.
export const { GET } = userRoutes.collection;
