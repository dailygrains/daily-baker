import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getTagTypeById } from '@/app/actions/tag';
import Link from 'next/link';
import { Tags, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const COLOR_CLASSES: Record<string, string> = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

export default async function TagTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const tagTypeResult = await getTagTypeById(id);

  if (!tagTypeResult.success || !tagTypeResult.data) {
    redirect('/dashboard/tag-types');
  }

  const tagType = tagTypeResult.data;
  const tagCount = tagType._count.tags;

  return (
    <>
      <SetPageHeader
        title={tagType.name}
        breadcrumbs={[
          { label: 'Tag Types', href: '/dashboard/tag-types' },
          { label: tagType.name },
        ]}
        actions={
          <Link
            href={`/dashboard/tag-types/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Tags</p>
            <p className="text-2xl font-bold">{tagCount}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Display Order</p>
            <p className="text-2xl font-bold">{tagType.order}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Created</p>
            <p className="text-sm">{formatDistanceToNow(new Date(tagType.createdAt), { addSuffix: true })}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Last Updated</p>
            <p className="text-sm">{formatDistanceToNow(new Date(tagType.updatedAt), { addSuffix: true })}</p>
          </div>
        </div>

        {/* Description */}
        {tagType.description && (
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="text-base-content/80">{tagType.description}</p>
          </section>
        )}

        {/* Tags in this Type */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tags in this Type</h2>
            <Link
              href={`/dashboard/tags/new?tagTypeId=${tagType.id}`}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
              Add Tag
            </Link>
          </div>

          {tagType.tags.length === 0 ? (
            <div className="text-center py-8">
              <Tags className="h-12 w-12 mx-auto text-base-content/30 mb-3" />
              <p className="text-base-content/70 mb-4">No tags in this type yet</p>
              <Link
                href={`/dashboard/tags/new?tagTypeId=${tagType.id}`}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4" />
                Create First Tag
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Color</th>
                    <th>Usage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tagType.tags.map((tag) => (
                    <tr key={tag.id} className="hover">
                      <td>
                        <Link
                          href={`/dashboard/tags/${tag.id}`}
                          className="font-semibold hover:text-primary"
                        >
                          {tag.name}
                        </Link>
                      </td>
                      <td className="text-base-content/70 max-w-xs truncate">
                        {tag.description || '-'}
                      </td>
                      <td>
                        {tag.color ? (
                          <span className={`badge ${COLOR_CLASSES[tag.color] || 'badge-ghost'}`}>
                            {tag.color}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <span className="badge badge-ghost">
                          {tag._count.entityTags} item{tag._count.entityTags !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/tags/${tag.id}/edit`}
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
        </section>
      </div>
    </>
  );
}
