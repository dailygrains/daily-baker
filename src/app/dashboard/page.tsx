import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { redirect } from 'next/navigation';
import { getPlatformStats, getRecentActivity } from '@/app/actions/platform-stats';
import {
  BarChart3,
  TrendingUp,
  Package,
  AlertCircle,
  Calendar,
  Wheat,
  Users,
  BookOpen,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Platform admins see platform-wide dashboard
  if (user.isPlatformAdmin) {
    const [statsResult, activityResult] = await Promise.all([
      getPlatformStats(),
      getRecentActivity(),
    ]);

    const stats = statsResult.success ? statsResult.data : null;
    const activity = activityResult.success ? activityResult.data : null;

    return (
      <DashboardLayout isPlatformAdmin={true}>
        <PageHeader
          title="Platform Dashboard"
          description="Overview of all bakeries on Daily Baker"
          actions={
            <Link href="/admin/bakeries" className="btn btn-primary btn-sm">
              <Wheat className="h-4 w-4 mr-2" />
              Manage Bakeries
            </Link>
          }
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Bakeries */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Wheat className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Bakeries</div>
              <div className="stat-value text-primary">{stats?.totals.bakeries ?? 0}</div>
              <div className="stat-desc">
                +{stats?.recent.bakeries ?? 0} in last 30 days
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-secondary">
                <Users className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Users</div>
              <div className="stat-value text-secondary">{stats?.totals.users ?? 0}</div>
              <div className="stat-desc">
                +{stats?.recent.users ?? 0} in last 30 days
              </div>
            </div>
          </div>

          {/* Total Recipes */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-accent">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Recipes</div>
              <div className="stat-value text-accent">{stats?.totals.recipes ?? 0}</div>
              <div className="stat-desc">Across all bakeries</div>
            </div>
          </div>

          {/* Total Ingredients */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-info">
                <Package className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Ingredients</div>
              <div className="stat-value text-info">{stats?.totals.ingredients ?? 0}</div>
              <div className="stat-desc">In inventory system</div>
            </div>
          </div>
        </div>

        {/* Top Bakeries */}
        {stats?.topBakeries && stats.topBakeries.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Recent Bakeries</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.topBakeries.map((bakery) => (
                <Link
                  key={bakery.id}
                  href={`/admin/bakeries/${bakery.id}/edit`}
                  className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="card-body">
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-lg w-10">
                          <Wheat className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{bakery.name}</h3>
                        <div className="flex gap-4 text-sm text-base-content/60 mt-1">
                          <span>{bakery._count.users} users</span>
                          <span>{bakery._count.recipes} recipes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activity && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Recent Bakeries */}
              {activity.bakeries.length > 0 && (
                <div className="card bg-base-100 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                      <Wheat className="h-5 w-5" />
                      New Bakeries
                    </h3>
                    <div className="space-y-3 mt-2">
                      {activity.bakeries.map((bakery) => (
                        <div key={bakery.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{bakery.name}</p>
                            <p className="text-xs text-base-content/60 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(bakery.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Users */}
              {activity.users.length > 0 && (
                <div className="card bg-base-100 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      New Users
                    </h3>
                    <div className="space-y-3 mt-2">
                      {activity.users.map((user) => (
                        <div key={user.id}>
                          <p className="font-medium text-sm">{user.name || user.email}</p>
                          <p className="text-xs text-base-content/60">
                            {user.bakery?.name || 'No bakery'}
                          </p>
                          <p className="text-xs text-base-content/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Recipes */}
              {activity.recipes.length > 0 && (
                <div className="card bg-base-100 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      New Recipes
                    </h3>
                    <div className="space-y-3 mt-2">
                      {activity.recipes.map((recipe) => (
                        <div key={recipe.id}>
                          <p className="font-medium text-sm">{recipe.name}</p>
                          <p className="text-xs text-base-content/60">
                            {recipe.bakery.name}
                          </p>
                          <p className="text-xs text-base-content/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(recipe.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/admin/bakeries/new"
              className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body">
                <h3 className="card-title text-lg">Create Bakery</h3>
                <p className="text-sm text-base-content/60">Add a new bakery to the platform</p>
              </div>
            </Link>

            <Link
              href="/admin/users"
              className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body">
                <h3 className="card-title text-lg">Manage Users</h3>
                <p className="text-sm text-base-content/60">View and assign users</p>
              </div>
            </Link>

            <Link
              href="/admin/bakeries"
              className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body">
                <h3 className="card-title text-lg">View All Bakeries</h3>
                <p className="text-sm text-base-content/60">See all bakeries on the platform</p>
              </div>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Regular users must be assigned to a bakery
  if (!user.bakery) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Welcome to Daily Baker"
          description="You're not currently assigned to a bakery"
        />

        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="font-bold">No Bakery Assigned</h3>
            <div className="text-sm">Please contact a platform administrator to assign you to a bakery.</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Bakery user dashboard
  return (
    <DashboardLayout
      bakeryName={user.bakery.name}
      userRole={user.role?.name}
    >
      <PageHeader
        title={`Welcome back, ${user.name || 'Baker'}!`}
        description={`${user.bakery.name} Dashboard`}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Production */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="stat-title">Today's Bake Sheets</div>
            <div className="stat-value text-primary">1</div>
            <div className="stat-desc">1 in progress</div>
          </div>
        </div>

        {/* Active Recipes */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div className="stat-title">Active Recipes</div>
            <div className="stat-value text-secondary">3</div>
            <div className="stat-desc">Published recipes</div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-warning">
              <Package className="h-8 w-8" />
            </div>
            <div className="stat-title">Low Stock Alerts</div>
            <div className="stat-value text-warning">0</div>
            <div className="stat-desc">All ingredients stocked</div>
          </div>
        </div>

        {/* This Week's Production */}
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-accent">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div className="stat-title">This Week</div>
            <div className="stat-value text-accent">180</div>
            <div className="stat-desc">Items produced</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a href="/dashboard/bake-sheets" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">View Bake Sheets</h3>
              <p className="text-sm text-base-content/60">See today's production schedule</p>
            </div>
          </a>

          <a href="/dashboard/recipes" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">Browse Recipes</h3>
              <p className="text-sm text-base-content/60">View all bakery recipes</p>
            </div>
          </a>

          <a href="/dashboard/ingredients" className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">Check Inventory</h3>
              <p className="text-sm text-base-content/60">Monitor ingredient levels</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity (placeholder) */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="text-center py-8 text-base-content/60">
              <p>Activity log coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
