import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getTagsByBakery } from '@/app/actions/tag';
import Link from 'next/link';
import { Plus, Tags } from 'lucide-react';
import { TagBadges } from '@/components/tags/TagBadges';

export default async function TagsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const tagsResult = await getTagsByBakery(user.bakeryId);

  if (!tagsResult.success) {
    return (
      <div className="alert alert-error">
        <span>{tagsResult.error}</span>
      </div>
    );
  }

  const tags = tagsResult.data || [];

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Tags"
        description="Label and categorize your items"
        actions={
          <Link href="/dashboard/tags/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Tag
          </Link>
        }
      />

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="text-center py-12">
          <Tags className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-2xl font-bold mb-2">No tags yet</h3>
          <p className="text-base-content/70 mb-6">
            Get started by creating your first tag
          </p>
          <Link href="/dashboard/tags/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Create Your First Tag
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra table-lg">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Usage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td>
                    <Link
                      href={`/dashboard/tags/${tag.id}`}
                      className="hover:opacity-80"
                    >
                      <TagBadges tags={[tag]} size="md" />
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/dashboard/tag-types/${tag.tagType.id}`}
                      className="text-base-content/70 hover:text-primary"
                    >
                      {tag.tagType.name}
                    </Link>
                  </td>
                  <td className="text-base-content/70 max-w-xs truncate">
                    {tag.description || '-'}
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
    </div>
  );
}
