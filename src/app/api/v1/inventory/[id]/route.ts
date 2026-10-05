import { inventoryRoutes } from '@/lib/api/resources/inventory';

// PUT accepts only { lowStockThreshold }. No DELETE: it would cascade lots and usage history.
export const { GET, PUT } = inventoryRoutes.single;
