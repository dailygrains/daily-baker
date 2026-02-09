import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getTagTypesByBakery } from '@/app/actions/tag';
import Link from 'next/link';
import { Plus, FolderTree, Tags } from 'lucide-react';

export default async function TagTypesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const tagTypesResult = await getTagTypesByBakery(user.bakeryId);

  if (!tagTypesResult.success) {
    return (
      <div className="alert alert-error">
        <span>{tagTypesResult.error}</span>
      </div>
    );
  }

  const tagTypes = tagTypesResult.data || [];
  const totalTagTypes = tagTypes.length;
  const totalTags = tagTypes.reduce((sum, tt) => sum + tt._count.tags, 0);

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Tag Types"
        description="Organize your tags into categories"
        actions={
          <Link href="/dashboard/tag-types/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Tag Type
          </Link>
        }
      />

      {/* Stats */}
      <div className="card bg-base-100 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Total Tag Types</p>
            <p className="text-2xl font-bold text-primary">{totalTagTypes}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Total Tags</p>
            <p className="text-2xl font-bold">{totalTags}</p>
          </div>
        </div>
      </div>

      {/* Tag Types List */}
      {tagTypes.length === 0 ? (
        <div className="text-center py-12">
          <FolderTree className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-2xl font-bold mb-2">No tag types yet</h3>
          <p className="text-base-content/70 mb-6">
            Get started by creating your first tag type
          </p>
          <Link href="/dashboard/tag-types/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Create Your First Tag Type
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra table-lg">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Order</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tagTypes.map((tagType) => (
                <tr key={tagType.id}>
                  <td>
                    <Link
                      href={`/dashboard/tag-types/${tagType.id}`}
                      className="font-semibold hover:text-primary flex items-center gap-2"
                    >
                      <FolderTree className="h-4 w-4" />
                      {tagType.name}
                    </Link>
                  </td>
                  <td className="text-base-content/70 max-w-xs truncate">
                    {tagType.description || '-'}
                  </td>
                  <td>{tagType.order}</td>
                  <td>
                    {tagType._count.tags > 0 ? (
                      <span className="badge badge-primary gap-1">
                        <Tags className="h-3 w-3" />
                        {tagType._count.tags}
                      </span>
                    ) : (
                      <span className="text-base-content/50">None</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/dashboard/tag-types/${tagType.id}/edit`}
                      className="btn btn-ghost btn-xs"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
