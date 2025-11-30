'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface User {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  bakeries: {
    bakery: {
      name: string;
    };
  }[];
  roleId: string | null;
  role: {
    name: string;
  } | null;
  createdAt: Date;
}

interface UsersTableProps {
  users: User[];
  currentUserId: string;
}

const ITEMS_PER_PAGE = 10;

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = users.slice(startIndex, endIndex);

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}/edit`);
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
              <th>Name</th>
              <th>Email</th>
              <th>Bakery</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((u) => (
              <tr
                key={u.id}
                onClick={() => handleRowClick(u.id)}
                className="hover cursor-pointer"
              >
                <td className="align-top">
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-10 rounded-full">
                        {u.imageUrl ? (
                          <Image src={u.imageUrl} alt={u.name || u.email} width={40} height={40} className="rounded-full" />
                        ) : (
                          <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                            <span className="text-sm">
                              {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{u.name || 'Not set'}</div>
                      {u.id === currentUserId && (
                        <span className="badge badge-primary badge-sm">You</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="align-top">{u.email}</td>
                <td className="align-top">
                  {u.bakeries.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {u.bakeries.map((userBakery, idx) => (
                        <span key={idx} className="badge badge-sm badge-outline">
                          {userBakery.bakery.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-base-content/40 italic">No bakery</span>
                  )}
                </td>
                <td className="align-top">
                  {u.role ? (
                    <span className="badge badge-outline">{u.role.name}</span>
                  ) : (
                    <span className="text-base-content/40 italic">No role</span>
                  )}
                </td>
                <td className="align-top">
                  <div className="text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
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
