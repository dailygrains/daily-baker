'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeft, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useHeader } from '@/contexts/HeaderContext';

export function UnifiedHeader() {
  const router = useRouter();
  const { config } = useHeader();
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const stickyClass = config?.sticky
    ? 'sticky top-0 z-10 shadow-sm'
    : '';

  // Determine back URL from breadcrumbs - last breadcrumb with an href
  const backUrl = config?.breadcrumbs
    ?.filter(crumb => crumb.href)
    .slice(-1)[0]?.href;

  function handleBackClick(e: React.MouseEvent) {
    if (config?.hasUnsavedChanges) {
      e.preventDefault();
      setShowUnsavedModal(true);
    }
  }

  function handleConfirmLeave() {
    setShowUnsavedModal(false);
    if (backUrl) {
      router.push(backUrl);
    }
  }

  return (
    <>
      <header className={`bg-base-100 border-b border-base-300 ${stickyClass}`}>
        <div className="relative flex items-center gap-2 px-4 py-3">
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
            <>
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
              {/* Center Content (e.g., search) — absolutely centered on the header */}
              {config.centerContent && (
                <div className="hidden sm:flex absolute inset-0 items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto">
                    {config.centerContent}
                  </div>
                </div>
              )}
              {/* Actions - vertically aligned with back button auto-added */}
              <div className="flex items-center gap-2 shrink-0 [&_.btn]:btn-lg">
                {backUrl && (
                  <Link
                    href={backUrl}
                    className="btn btn-ghost btn-lg"
                    onClick={handleBackClick}
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                  </Link>
                )}
                {/* Hide icons in action buttons (except loading spinners) */}
                <div className="flex items-center gap-2 [&_.btn_svg]:hidden [&_.btn_.loading]:block">
                  {config.actions}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1">
              <span className="font-bold text-lg">Daily Baker</span>
            </div>
          )}
        </div>
      </header>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Unsaved Changes</h3>
            <p className="py-4">
              You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowUnsavedModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleConfirmLeave}
              >
                Leave Page
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowUnsavedModal(false)} />
        </dialog>
      )}
    </>
  );
}
