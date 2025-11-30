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
  Menu,
  Wheat,
  Mail,
  Activity,
  BarChart3,
  Wrench,
  Shield
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
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  return (
    <div className="drawer-side z-10">
      <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

      <aside className="bg-base-100 w-72 min-h-full border-r border-base-300 flex flex-col">
        {/* Logo / Brand */}
        <div className="sticky top-0 z-20 bg-base-100">
          <div className="px-6 py-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-bold text-lg">Daily Baker</span>
                <span className="text-xs text-base-content/60">Bakery Management</span>
              </div>
            </Link>
          </div>

          {/* Bakery Selector - show for all users to select bakery context */}
          <BakerySelector bakeries={bakeries} currentBakeryId={currentBakeryId ?? null} />
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="menu gap-1">
            {/* Dashboard */}
            <li>
              <Link
                href="/dashboard"
                className={`gap-3 ${isActive('/dashboard') ? 'active' : ''}`}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
            </li>

            {/* Production */}
            <li className="menu-title mt-4">
              <span>Production</span>
            </li>
            <li>
              <Link
                href="/dashboard/recipes"
                className={`gap-3 ${isActive('/dashboard/recipes') ? 'active' : ''}`}
              >
                <BookOpen className="h-5 w-5" />
                Recipes
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/bake-sheets"
                className={`gap-3 ${isActive('/dashboard/bake-sheets') ? 'active' : ''}`}
              >
                <Briefcase className="h-5 w-5" />
                Bake Sheets
              </Link>
            </li>

            {/* Inventory */}
            <li className="menu-title mt-4">
              <span>Inventory</span>
            </li>
            <li>
              <Link
                href="/dashboard/inventory"
                className={`gap-3 ${isActive('/dashboard/inventory') ? 'active' : ''}`}
              >
                <BarChart3 className="h-5 w-5" />
                Inventory
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/ingredients"
                className={`gap-3 ${isActive('/dashboard/ingredients') ? 'active' : ''}`}
              >
                <Package className="h-5 w-5" />
                Ingredients
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/vendors"
                className={`gap-3 ${isActive('/dashboard/vendors') ? 'active' : ''}`}
              >
                <ShoppingCart className="h-5 w-5" />
                Vendors
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/equipment"
                className={`gap-3 ${isActive('/dashboard/equipment') ? 'active' : ''}`}
              >
                <Wrench className="h-5 w-5" />
                Equipment
              </Link>
            </li>

            {/* Team (if has permission) */}
            {!isPlatformAdmin && (
              <>
                <li className="menu-title mt-4">
                  <span>Team</span>
                </li>
                <li>
                  <Link
                    href="/dashboard/team"
                    className={`gap-3 ${isActive('/dashboard/team') ? 'active' : ''}`}
                  >
                    <Users className="h-5 w-5" />
                    Team Members
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/activity"
                    className={`gap-3 ${isActive('/dashboard/activity') ? 'active' : ''}`}
                  >
                    <Activity className="h-5 w-5" />
                    Activity
                  </Link>
                </li>
              </>
            )}

            {/* Platform Admin */}
            {isPlatformAdmin && (
              <>
                <li className="menu-title mt-4">
                  <span>Platform Admin</span>
                </li>
                <li>
                  <Link
                    href="/admin/bakeries"
                    className={`gap-3 ${isActive('/admin/bakeries') ? 'active' : ''}`}
                  >
                    <Wheat className="h-5 w-5" />
                    All Bakeries
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/users"
                    className={`gap-3 ${isActive('/admin/users') ? 'active' : ''}`}
                  >
                    <Users className="h-5 w-5" />
                    All Users
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/invitations"
                    className={`gap-3 ${isActive('/admin/invitations') ? 'active' : ''}`}
                  >
                    <Mail className="h-5 w-5" />
                    Invitations
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/roles"
                    className={`gap-3 ${isActive('/admin/roles') ? 'active' : ''}`}
                  >
                    <Shield className="h-5 w-5" />
                    Roles
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/activity"
                    className={`gap-3 ${isActive('/admin/activity') ? 'active' : ''}`}
                  >
                    <Activity className="h-5 w-5" />
                    Activity Logs
                  </Link>
                </li>
              </>
            )}

            {/* Settings */}
            <li className="menu-title mt-4">
              <span>Settings</span>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                className={`gap-3 ${isActive('/dashboard/settings') ? 'active' : ''}`}
              >
                <Settings className="h-5 w-5" />
                {isPlatformAdmin ? 'Platform Settings' : 'Bakery Settings'}
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Section - Fixed at bottom */}
        <div className="sticky bottom-0 bg-base-100 px-6 py-4 border-t border-base-300">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex flex-col flex-1 min-w-0">
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
    </div>
  );
}
