import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getTagById } from '@/app/actions/tag';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Package, BookOpen, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TagBadges } from '@/components/tags/TagBadges';

const ENTITY_ICONS: Record<string, typeof Package> = {
  ingredient: Package,
  recipe: BookOpen,
  vendor: ShoppingCart,
};

const ENTITY_PATHS: Record<string, string> = {
  ingredient: '/dashboard/ingredients',
  recipe: '/dashboard/recipes',
  vendor: '/dashboard/vendors',
};

export default async function TagDetailPage({
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

  const tagResult = await getTagById(id);

  if (!tagResult.success || !tagResult.data) {
    redirect('/dashboard/tags');
  }

  const tag = tagResult.data;
  const usageCount = tag._count.entityTags;

  // Get entity details for the tagged items
  const entityDetails = await Promise.all(
    tag.entityTags.map(async (et) => {
      let name = 'Unknown';
      switch (et.entityType) {
        case 'ingredient': {
          const ingredient = await db.ingredient.findUnique({
            where: { id: et.entityId },
            select: { name: true },
          });
          name = ingredient?.name || 'Deleted Ingredient';
          break;
        }
        case 'recipe': {
          const recipe = await db.recipe.findUnique({
            where: { id: et.entityId },
            select: { name: true },
          });
          name = recipe?.name || 'Deleted Recipe';
          break;
        }
        case 'vendor': {
          const vendor = await db.vendor.findUnique({
            where: { id: et.entityId },
            select: { name: true },
          });
          name = vendor?.name || 'Deleted Vendor';
          break;
        }
      }
      return {
        ...et,
        name,
      };
    })
  );

  // Group by entity type
  const groupedEntities = entityDetails.reduce((acc, entity) => {
    if (!acc[entity.entityType]) {
      acc[entity.entityType] = [];
    }
    acc[entity.entityType].push(entity);
    return acc;
  }, {} as Record<string, typeof entityDetails>);

  return (
    <>
      <SetPageHeader
        title={tag.name}
        breadcrumbs={[
          { label: 'Tags', href: '/dashboard/tags' },
          { label: tag.name },
        ]}
        actions={
          <Link
            href={`/dashboard/tags/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      {/* Tag badge display */}
      <div className="mb-6">
        <TagBadges tags={[tag]} size="md" />
      </div>

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Tag Type</p>
            <Link
              href={`/dashboard/tag-types/${tag.tagType.id}`}
              className="text-lg font-semibold hover:text-primary"
            >
              {tag.tagType.name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Usage</p>
            <p className="text-2xl font-bold">{usageCount}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Created</p>
            <p className="text-sm">{formatDistanceToNow(new Date(tag.createdAt), { addSuffix: true })}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Last Updated</p>
            <p className="text-sm">{formatDistanceToNow(new Date(tag.updatedAt), { addSuffix: true })}</p>
          </div>
        </div>

        {/* Description */}
        {tag.description && (
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="text-base-content/80">{tag.description}</p>
          </section>
        )}

        {/* Tagged Items */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Tagged Items</h2>

          {usageCount === 0 ? (
            <p className="text-base-content/50 italic">This tag is not assigned to any items yet</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEntities).map(([entityType, entities]) => {
                const Icon = ENTITY_ICONS[entityType] || Package;
                const basePath = ENTITY_PATHS[entityType] || '/dashboard';

                return (
                  <div key={entityType}>
                    <h3 className="text-lg font-medium mb-2 capitalize flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {entityType}s ({entities.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="table table-zebra">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Tagged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entities.map((entity) => (
                            <tr key={entity.id} className="hover">
                              <td>
                                <Link
                                  href={`${basePath}/${entity.entityId}`}
                                  className="font-semibold hover:text-primary"
                                >
                                  {entity.name}
                                </Link>
                              </td>
                              <td className="text-base-content/70">
                                {formatDistanceToNow(new Date(entity.createdAt), { addSuffix: true })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
