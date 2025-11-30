import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
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
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  userEmail?: string;
  bakeryName?: string;
  userRole?: string;
  isPlatformAdmin?: boolean;
}

export function DashboardLayout({
  children,
  userName,
  userEmail,
  userRole,
  isPlatformAdmin = false
}: DashboardLayoutProps) {
  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main Content */}
      <div className="drawer-content flex flex-col">
        {/* Mobile Menu Button */}
        <div className="lg:hidden p-4">
          <label htmlFor="sidebar-drawer" className="btn btn-square btn-ghost">
            <Menu className="h-5 w-5" />
          </label>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 bg-base-200">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-10">
        <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

        <aside className="bg-base-100 w-72 min-h-full border-r border-base-300 flex flex-col">
          {/* Logo / Brand */}
          <div className="sticky top-0 z-20 bg-base-100 px-6 py-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-bold text-lg">Daily Baker</span>
                <span className="text-xs text-base-content/60">Bakery Management</span>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 flex-1 overflow-y-auto">
            <ul className="menu gap-1">
              {/* Dashboard */}
              <li>
                <Link href="/dashboard" className="gap-3">
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
              </li>

              {/* Production */}
              <li className="menu-title mt-4">
                <span>Production</span>
              </li>
              <li>
                <Link href="/dashboard/recipes" className="gap-3">
                  <BookOpen className="h-5 w-5" />
                  Recipes
                </Link>
              </li>
              <li>
                <Link href="/dashboard/bake-sheets" className="gap-3">
                  <Briefcase className="h-5 w-5" />
                  Bake Sheets
                </Link>
              </li>

              {/* Inventory */}
              <li className="menu-title mt-4">
                <span>Inventory</span>
              </li>
              <li>
                <Link href="/dashboard/inventory" className="gap-3">
                  <BarChart3 className="h-5 w-5" />
                  Inventory Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ingredients" className="gap-3">
                  <Package className="h-5 w-5" />
                  Ingredients
                </Link>
              </li>
              <li>
                <Link href="/dashboard/vendors" className="gap-3">
                  <ShoppingCart className="h-5 w-5" />
                  Vendors
                </Link>
              </li>
              <li>
                <Link href="/dashboard/equipment" className="gap-3">
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
                    <Link href="/dashboard/team" className="gap-3">
                      <Users className="h-5 w-5" />
                      Team Members
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/activity" className="gap-3">
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
                    <Link href="/admin/bakeries" className="gap-3">
                      <Wheat className="h-5 w-5" />
                      All Bakeries
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/users" className="gap-3">
                      <Users className="h-5 w-5" />
                      All Users
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/invitations" className="gap-3">
                      <Mail className="h-5 w-5" />
                      Invitations
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/roles" className="gap-3">
                      <Shield className="h-5 w-5" />
                      Roles
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/activity" className="gap-3">
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
                <Link href="/dashboard/settings" className="gap-3">
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
    </div>
  );
}
