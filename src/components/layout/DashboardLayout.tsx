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
  ChevronLeft,
  Menu,
  Wheat,
  Mail
} from 'lucide-react';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  bakeryName?: string;
  userRole?: string;
  isPlatformAdmin?: boolean;
}

export function DashboardLayout({
  children,
  bakeryName,
  userRole,
  isPlatformAdmin = false
}: DashboardLayoutProps) {
  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main Content */}
      <div className="drawer-content flex flex-col">
        {/* Top Navigation Bar */}
        <header className="navbar bg-base-100 border-b border-base-300 px-4 lg:px-6">
          <div className="flex-none lg:hidden">
            <label htmlFor="sidebar-drawer" className="btn btn-square btn-ghost">
              <Menu className="h-5 w-5" />
            </label>
          </div>

          <div className="flex-1 px-2 lg:px-0">
            <div className="flex items-center gap-2">
              {bakeryName && (
                <>
                  <Wheat className="h-5 w-5 text-primary hidden lg:block" />
                  <span className="text-lg font-semibold hidden lg:inline">{bakeryName}</span>
                </>
              )}
              {isPlatformAdmin && (
                <div className="badge badge-primary badge-sm">Platform Admin</div>
              )}
            </div>
          </div>

          <div className="flex-none gap-2">
            {userRole && (
              <div className="badge badge-outline hidden sm:inline-flex">{userRole}</div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 bg-base-200">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-10">
        <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

        <aside className="bg-base-100 w-72 min-h-full border-r border-base-300">
          {/* Logo / Brand */}
          <div className="sticky top-0 z-20 bg-base-100 px-6 py-4 border-b border-base-300">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-lg w-10">
                  <Wheat className="h-6 w-6" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg">Daily Baker</span>
                <span className="text-xs text-base-content/60">Bakery Management</span>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4">
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
        </aside>
      </div>
    </div>
  );
}
