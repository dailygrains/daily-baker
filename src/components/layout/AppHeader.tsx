'use client';

import { PanelLeft } from 'lucide-react';

export function AppHeader() {
  return (
    <nav className="navbar w-full bg-base-100 border-b border-base-300">
      <label
        htmlFor="sidebar-drawer"
        aria-label="toggle sidebar"
        className="btn btn-square btn-ghost"
      >
        <PanelLeft className="h-5 w-5" />
      </label>
      <div className="flex-1 px-2">
        <span className="font-bold text-lg is-drawer-open:hidden lg:is-drawer-close:inline">Daily Baker</span>
      </div>
    </nav>
  );
}
