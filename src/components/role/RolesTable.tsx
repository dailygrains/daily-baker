'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pagination, usePageSize } from '@/components/ui/Pagination';

interface Role {
  id: string;
  name: string;
  description: string | null;
  _count: {
    users: number;
  };
  permissions: Record<string, boolean>;
}

interface RolesTableProps {
  roles: Role[];
}

// Define the same permissions as in RoleForm to ensure consistency
const KNOWN_PERMISSIONS = [
  'recipes.read',
  'recipes.write',
  'recipes.delete',
  'ingredients.read',
  'ingredients.write',
  'production-sheets.read',
  'production-sheets.write',
  'production-sheets.complete',
  'vendors.read',
  'vendors.write',
  'team.read',
  'team.write',
  'settings.read',
  'settings.write',
];

export function RolesTable({ roles }: RolesTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { itemsPerPage, setItemsPerPage, isInitialized } = usePageSize();

  const effectiveItemsPerPage = itemsPerPage === Infinity ? roles.length : itemsPerPage;
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const endIndex = startIndex + effectiveItemsPerPage;
  const currentRoles = roles.slice(startIndex, endIndex);

  const handleRowClick = (roleId: string) => {
    router.push(`/admin/roles/${roleId}/edit`);
  };

  const getEnabledPermissionsCount = (permissions: Record<string, boolean>) => {
    // Only count known permissions that are enabled
    return KNOWN_PERMISSIONS.filter(perm => permissions[perm] === true).length;
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Role</th>
              <th>Permissions</th>
              <th className="text-center">Users</th>
            </tr>
          </thead>
          <tbody>
            {currentRoles.map((role) => (
              <tr
                key={role.id}
                onClick={() => handleRowClick(role.id)}
                className="hover cursor-pointer"
              >
                <td className="align-top">
                  <div>
                    <div className="font-bold">{role.name}</div>
                    {role.description && (
                      <div className="text-sm opacity-50 line-clamp-2">
                        {role.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="align-top">
                  <div className="text-sm">
                    <span className="badge badge-ghost">
                      {getEnabledPermissionsCount(role.permissions)} enabled
                    </span>
                  </div>
                </td>
                <td className="text-center align-top">
                  <span className="badge badge-ghost">{role._count.users}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInitialized && (
        <Pagination
          totalItems={roles.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
}
