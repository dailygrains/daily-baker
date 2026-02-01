'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhoneNumber } from '@/lib/utils/phone';
import { Pagination, usePageSize } from '@/components/ui/Pagination';

interface Bakery {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  _count: {
    users: number;
    recipes: number;
  };
}

interface BakeriesTableProps {
  bakeries: Bakery[];
}

export function BakeriesTable({ bakeries }: BakeriesTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { itemsPerPage, setItemsPerPage, isInitialized } = usePageSize();

  const effectiveItemsPerPage = itemsPerPage === Infinity ? bakeries.length : itemsPerPage;
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const endIndex = startIndex + effectiveItemsPerPage;
  const currentBakeries = bakeries.slice(startIndex, endIndex);

  const handleRowClick = (bakeryId: string) => {
    router.push(`/admin/bakeries/${bakeryId}/edit`);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Bakery</th>
              <th>Contact</th>
              <th className="text-center">Users</th>
              <th className="text-center">Recipes</th>
            </tr>
          </thead>
          <tbody>
            {currentBakeries.map((bakery) => (
              <tr
                key={bakery.id}
                onClick={() => handleRowClick(bakery.id)}
                className="hover cursor-pointer"
              >
                <td className="align-top">
                  <div>
                    <div className="font-bold">{bakery.name}</div>
                    {bakery.description && (
                      <div className="text-sm opacity-50 line-clamp-1">
                        {bakery.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="align-top">
                  <div className="text-sm space-y-1">
                    {bakery.email && (
                      <div className="opacity-70">{bakery.email}</div>
                    )}
                    {bakery.address && (
                      <div className="opacity-70">{bakery.address}</div>
                    )}
                    {bakery.phone && (
                      <div className="opacity-70">{formatPhoneNumber(bakery.phone)}</div>
                    )}
                  </div>
                </td>
                <td className="text-center align-top">
                  <span className="badge badge-ghost">{bakery._count.users}</span>
                </td>
                <td className="text-center align-top">
                  <span className="badge badge-ghost">{bakery._count.recipes}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInitialized && (
        <Pagination
          totalItems={bakeries.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
}
