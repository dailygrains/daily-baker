'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhoneNumber } from '@/lib/utils/phone';

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

const ITEMS_PER_PAGE = 10;

export function BakeriesTable({ bakeries }: BakeriesTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(bakeries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentBakeries = bakeries.slice(startIndex, endIndex);

  const handleRowClick = (bakeryId: string) => {
    router.push(`/admin/bakeries/${bakeryId}/edit`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`join-item btn btn-sm ${
                  currentPage === page ? 'btn-active' : ''
                }`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
