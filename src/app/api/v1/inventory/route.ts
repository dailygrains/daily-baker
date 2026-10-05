import { inventoryRoutes } from '@/lib/api/resources/inventory';

// Read-only collection: Inventory rows are created with an ingredient's first lot.
export const { GET } = inventoryRoutes.collection;
