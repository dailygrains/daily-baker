'use client';

import { PanelLeft, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useHeader } from '@/contexts/HeaderContext';

export function UnifiedHeader() {
  const { config } = useHeader();

  const stickyClass = config?.sticky
    ? 'sticky top-0 z-10 shadow-sm'
    : '';

  // Determine back URL from breadcrumbs - last breadcrumb with an href
  const backUrl = config?.breadcrumbs
    ?.filter(crumb => crumb.href)
    .slice(-1)[0]?.href;

  return (
    <header className={`bg-base-100 border-b border-base-300 ${stickyClass}`}>
      <div className="flex items-start gap-2 px-4 py-3">
        {/* Sidebar Toggle */}
        <label
          htmlFor="sidebar-drawer"
          aria-label="toggle sidebar"
          className="btn btn-square btn-ghost btn-sm"
        >
          <PanelLeft className="h-5 w-5" />
        </label>

        {/* Page Header Content */}
        {config ? (
          <div className="flex flex-1 flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold truncate">{config.title}</h1>
              {config.breadcrumbs && config.breadcrumbs.length > 0 && (
                <div className="breadcrumbs text-sm py-0">
                  <ul>
                    {config.breadcrumbs.map((crumb, index) => (
                      <li key={index}>
                        {crumb.href ? (
                          <Link href={crumb.href} className="text-base-content/60 hover:text-base-content">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-base-content/60">{crumb.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {config.description && (
                <p className="text-sm text-base-content/60 truncate">{config.description}</p>
              )}
            </div>
            {/* Actions - vertically aligned with back button auto-added */}
            <div className="flex items-center gap-2 shrink-0">
              {backUrl && (
                <Link href={backUrl} className="btn btn-ghost">
                  <ArrowLeft className="h-5 w-5" />
                  Back
                </Link>
              )}
              {config.actions}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <span className="font-bold text-lg">Daily Baker</span>
          </div>
        )}
      </div>
    </header>
  );
}
