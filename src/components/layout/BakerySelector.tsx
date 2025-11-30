'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Bakery {
  id: string;
  name: string;
}

interface BakerySelectorProps {
  bakeries: Bakery[];
  currentBakeryId: string | null;
}

export function BakerySelector({ bakeries, currentBakeryId }: BakerySelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingBakeryId, setPendingBakeryId] = useState<string | null>(null);

  // Handle cookie setting in useEffect to satisfy ESLint
  useEffect(() => {
    if (pendingBakeryId) {
      document.cookie = `selectedBakeryId=${pendingBakeryId}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
      // No need to reset pendingBakeryId since page will refresh
    }
  }, [pendingBakeryId, router]);

  // Don't show if no bakeries assigned
  if (bakeries.length === 0) {
    return null;
  }

  const currentBakery = bakeries.find(b => b.id === currentBakeryId) || bakeries[0];
  const hasMultipleBakeries = bakeries.length > 1;

  const handleBakeryChange = async (bakeryId: string) => {
    setIsOpen(false);
    setPendingBakeryId(bakeryId);
  };

  return (
    <div className="px-6 py-3 border-b border-base-300">
      <div className="dropdown dropdown-bottom w-full">
        <button
          type="button"
          tabIndex={0}
          onClick={() => hasMultipleBakeries && setIsOpen(!isOpen)}
          disabled={!hasMultipleBakeries}
          className="btn btn-ghost btn-sm w-full justify-between normal-case font-normal"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">{currentBakery.name}</span>
          </div>
          {hasMultipleBakeries && (
            <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {isOpen && hasMultipleBakeries && (
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-full mt-1 border border-base-300 max-h-60 overflow-y-auto"
          >
            {bakeries.map((bakery) => (
              <li key={bakery.id}>
                <button
                  type="button"
                  onClick={() => handleBakeryChange(bakery.id)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{bakery.name}</span>
                  {bakery.id === currentBakeryId && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
