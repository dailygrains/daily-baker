'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Wheat,
  Mail,
  Activity,
  BarChart3,
  Wrench,
  Shield,
  Tags,
  FolderTree
} from 'lucide-react';
import { BakerySelector } from './BakerySelector';

interface Bakery {
  id: string;
  name: string;
}

interface DashboardSidebarProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  isPlatformAdmin?: boolean;
  bakeries?: Bakery[];
  currentBakeryId?: string | null;
}

export function DashboardSidebar({
  userName,
  userEmail,
  userRole,
  isPlatformAdmin = false,
  bakeries = [],
  currentBakeryId
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const getLinkClass = (path: string) => {
    const active = isActive(path);
    const baseClass = 'gap-3 is-drawer-close:justify-center is-drawer-close:tooltip is-drawer-close:tooltip-right';
    return `${baseClass} ${active ? 'bg-primary text-primary-content' : ''}`;
  };

  return (
    <aside className="flex min-h-full flex-col items-start bg-base-100 border-r border-base-300 is-drawer-open:w-64 transition-all duration-200 is-drawer-close:overflow-visible is-drawer-close:relative is-drawer-close:z-[9999]">
      {/* Logo / Brand */}
      <div className="sticky top-0 z-20 bg-base-100 w-full">
        <div className="px-4 py-4 is-drawer-close:hidden">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-lg">Daily Baker</span>
              <span className="text-xs text-base-content/60">Bakery Management</span>
            </div>
          </Link>
        </div>

        {/* Bakery Selector - hide when collapsed */}
        <div className="is-drawer-close:hidden">
          <BakerySelector bakeries={bakeries} currentBakeryId={currentBakeryId ?? null} />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="w-full flex-1 overflow-y-auto is-drawer-close:overflow-visible p-2">
        <ul className="menu w-full grow gap-1 is-drawer-close:overflow-visible">
          {/* Dashboard */}
          <li>
            <Link
              href="/dashboard"
              className={getLinkClass('/dashboard')}
              data-tip="Dashboard"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Dashboard</span>
            </Link>
          </li>

          {/* Production */}
          <li className="menu-title mt-4 is-drawer-close:hidden">
            <span>Production</span>
          </li>
          <li className="is-drawer-open:hidden mt-4">
            <div className="divider my-0"></div>
          </li>
          <li>
            <Link
              href="/dashboard/recipes"
              className={getLinkClass('/dashboard/recipes')}
              data-tip="Recipes"
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Recipes</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/production-sheets"
              className={getLinkClass('/dashboard/production-sheets')}
              data-tip="Production Sheets"
            >
              <Briefcase className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Production Sheets</span>
            </Link>
          </li>

          {/* Inventory */}
          <li className="menu-title mt-4 is-drawer-close:hidden">
            <span>Inventory</span>
          </li>
          <li className="is-drawer-open:hidden mt-2">
            <div className="divider my-0"></div>
          </li>
          <li>
            <Link
              href="/dashboard/ingredients"
              className={getLinkClass('/dashboard/ingredients')}
              data-tip="Ingredients"
            >
              <Package className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Ingredients</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/inventory"
              className={getLinkClass('/dashboard/inventory')}
              data-tip="Inventory"
            >
              <BarChart3 className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Inventory</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/equipment"
              className={getLinkClass('/dashboard/equipment')}
              data-tip="Equipment"
            >
              <Wrench className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Equipment</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/vendors"
              className={getLinkClass('/dashboard/vendors')}
              data-tip="Vendors"
            >
              <ShoppingCart className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Vendors</span>
            </Link>
          </li>

          {/* Tagging */}
          <li className="menu-title mt-4 is-drawer-close:hidden">
            <span>Tagging</span>
          </li>
          <li className="is-drawer-open:hidden mt-2">
            <div className="divider my-0"></div>
          </li>
          <li>
            <Link
              href="/dashboard/tag-types"
              className={getLinkClass('/dashboard/tag-types')}
              data-tip="Tag Types"
            >
              <FolderTree className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Tag Types</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/tags"
              className={getLinkClass('/dashboard/tags')}
              data-tip="Tags"
            >
              <Tags className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">Tags</span>
            </Link>
          </li>

          {/* Team (if has permission) */}
          {!isPlatformAdmin && (
            <>
              <li className="menu-title mt-4 is-drawer-close:hidden">
                <span>Team</span>
              </li>
              <li className="is-drawer-open:hidden mt-2">
                <div className="divider my-0"></div>
              </li>
              <li>
                <Link
                  href="/dashboard/team"
                  className={getLinkClass('/dashboard/team')}
                  data-tip="Team Members"
                >
                  <Users className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">Team Members</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/activity"
                  className={getLinkClass('/dashboard/activity')}
                  data-tip="Activity"
                >
                  <Activity className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">Activity</span>
                </Link>
              </li>
            </>
          )}

          {/* Platform Admin */}
          {isPlatformAdmin && (
            <>
              <li className="menu-title mt-4 is-drawer-close:hidden">
                <span>Platform Admin</span>
              </li>
              <li className="is-drawer-open:hidden mt-2">
                <div className="divider my-0"></div>
              </li>
              <li>
                <Link
                  href="/admin/bakeries"
                  className={getLinkClass('/admin/bakeries')}
                  data-tip="All Bakeries"
                >
                  <Wheat className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">All Bakeries</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={getLinkClass('/admin/users')}
                  data-tip="All Users"
                >
                  <Users className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">All Users</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/invitations"
                  className={getLinkClass('/admin/invitations')}
                  data-tip="Invitations"
                >
                  <Mail className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">Invitations</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/roles"
                  className={getLinkClass('/admin/roles')}
                  data-tip="Roles"
                >
                  <Shield className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">Roles</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/activity"
                  className={getLinkClass('/admin/activity')}
                  data-tip="Activity Logs"
                >
                  <Activity className="h-5 w-5 shrink-0" />
                  <span className="is-drawer-close:hidden">Activity Logs</span>
                </Link>
              </li>
            </>
          )}

          {/* Settings */}
          <li className="menu-title mt-4 is-drawer-close:hidden">
            <span>Settings</span>
          </li>
          <li className="is-drawer-open:hidden mt-2">
            <div className="divider my-0"></div>
          </li>
          <li>
            <Link
              href="/dashboard/settings"
              className={getLinkClass('/dashboard/settings')}
              data-tip={isPlatformAdmin ? 'Platform Settings' : 'Bakery Settings'}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span className="is-drawer-close:hidden">
                {isPlatformAdmin ? 'Platform Settings' : 'Bakery Settings'}
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Section - Fixed at bottom */}
      <div className="sticky bottom-0 bg-base-100 p-4 is-drawer-close:p-2 border-t border-base-300 w-full">
        <div className="flex items-center gap-3 is-drawer-close:justify-center">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: {
                  width: '40px',
                  height: '40px',
                },
              }
            }}
          />
          <div className="flex flex-col flex-1 min-w-0 is-drawer-close:hidden">
            {(userName || userEmail) && (
              <span className="text-sm font-medium truncate">{userName || userEmail}</span>
            )}
            {isPlatformAdmin ? (
              <span className="text-xs text-primary truncate">Platform Admin</span>
            ) : userRole ? (
              <span className="text-xs text-base-content/60 truncate">{userRole}</span>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
