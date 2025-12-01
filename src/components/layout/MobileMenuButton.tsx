'use client';

import { Menu } from 'lucide-react';

export function MobileMenuButton() {
  return (
    <div className="lg:hidden p-4">
      <label htmlFor="sidebar-drawer" className="btn btn-square btn-ghost">
        <Menu className="h-5 w-5" />
      </label>
    </div>
  );
}
