import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { redirect } from 'next/navigation';
import { getPlatformStats, getRecentActivity } from '@/app/actions/platform-stats';
import {
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
      <>
        <SetPageHeader
          title="Platform Dashboard"
          description="Overview of all bakeries on Daily Baker"
          actions={
            <Link href="/admin/bakeries" className="btn btn-primary btn-sm">
              <Wheat className="h-4 w-4 mr-2" />
              Manage Bakeries
            </Link>
          }
        />

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-base-content/70">Total Bakeries</p>
                <p className="text-2xl font-bold text-primary">{stats?.totals.bakeries ?? 0}</p>
                <p className="text-sm text-base-content/60">+{stats?.recent.bakeries ?? 0} in last 30 days</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totals.users ?? 0}</p>
                <p className="text-sm text-base-content/60">+{stats?.recent.users ?? 0} in last 30 days</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Total Recipes</p>
                <p className="text-2xl font-bold">{stats?.totals.recipes ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Total Ingredients</p>
                <p className="text-2xl font-bold">{stats?.totals.ingredients ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Bakeries */}
        {stats?.topBakeries && stats.topBakeries.length > 0 && (
          <div className="card bg-base-200 shadow-sm mt-8">
            <div className="card-body">
              <h2 className="card-title">Recent Bakeries</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.topBakeries.map((bakery) => (
                  <Link
                    key={bakery.id}
                    href={`/admin/bakeries/${bakery.id}/edit`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
                  >
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-lg w-10">
                        <Wheat className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{bakery.name}</h3>
                      <div className="flex gap-4 text-sm text-base-content/60">
                        <span>{bakery._count.users} users</span>
                        <span>{bakery._count.recipes} recipes</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activity && (
          <div className="card bg-base-200 shadow-sm mt-8">
            <div className="card-body">
              <h2 className="card-title">Recent Activity</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Recent Bakeries */}
                {activity.bakeries.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Wheat className="h-5 w-5" />
                      New Bakeries
                    </h3>
                    <div className="space-y-3">
                      {activity.bakeries.map((bakery) => (
                        <div key={bakery.id}>
                          <p className="font-medium text-sm">{bakery.name}</p>
                          <p className="text-xs text-base-content/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(bakery.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Users */}
                {activity.users.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      New Users
                    </h3>
                    <div className="space-y-3">
                      {activity.users.map((user) => (
                        <div key={user.id}>
                          <p className="font-medium text-sm">{user.name || user.email}</p>
                          <p className="text-xs text-base-content/60">
                            {user.bakeries?.[0]?.bakery?.name || 'No bakery'}
                          </p>
                          <p className="text-xs text-base-content/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Recipes */}
                {activity.recipes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      New Recipes
                    </h3>
                    <div className="space-y-3">
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card bg-base-200 shadow-sm mt-8">
          <div className="card-body">
            <h2 className="card-title">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/admin/bakeries/new"
                className="p-4 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
              >
                <h3 className="font-semibold">Create Bakery</h3>
                <p className="text-sm text-base-content/60">Add a new bakery to the platform</p>
              </Link>

              <Link
                href="/admin/users"
                className="p-4 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
              >
                <h3 className="font-semibold">Manage Users</h3>
                <p className="text-sm text-base-content/60">View and assign users</p>
              </Link>

              <Link
                href="/admin/bakeries"
                className="p-4 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
              >
                <h3 className="font-semibold">View All Bakeries</h3>
                <p className="text-sm text-base-content/60">See all bakeries on the platform</p>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Regular users must be assigned to a bakery
  if (!user.bakery) {
    return (
      <>
        <SetPageHeader
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
      </>
    );
  }

  // Bakery user dashboard
  return (
    <>
      <SetPageHeader
        title={`Welcome back, ${user.name || 'Baker'}!`}
        description={`${user.bakery.name} Dashboard`}
      />

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-base-content/70">Today&apos;s Production</p>
              <p className="text-2xl font-bold text-primary">1</p>
              <p className="text-sm text-base-content/60">1 in progress</p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Active Recipes</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-warning">0</p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">This Week&apos;s Production</p>
              <p className="text-2xl font-bold">180</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-200 shadow-sm mt-8">
        <div className="card-body">
          <h2 className="card-title">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/dashboard/production-sheets"
              className="p-4 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
            >
              <h3 className="font-semibold">View Production Sheets</h3>
              <p className="text-sm text-base-content/60">See today&apos;s production schedule</p>
            </Link>

            <Link
              href="/dashboard/recipes"
              className="p-4 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
            >
              <h3 className="font-semibold">Browse Recipes</h3>
              <p className="text-sm text-base-content/60">View all bakery recipes</p>
            </Link>

            <Link
              href="/dashboard/ingredients"
              className="p-4 rounded-lg bg-base-300 hover:bg-base-100 transition-colors"
            >
              <h3 className="font-semibold">Check Inventory</h3>
              <p className="text-sm text-base-content/60">Monitor ingredient levels</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity (placeholder) */}
      <div className="card bg-base-200 shadow-sm mt-8">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
          <div className="text-center py-8 text-base-content/60">
            <p>Activity log coming soon...</p>
          </div>
        </div>
      </div>
    </>
  );
}
