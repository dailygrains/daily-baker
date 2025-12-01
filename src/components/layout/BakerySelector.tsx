'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Check, AlertCircle } from 'lucide-react';
import { useToastStore } from '@/store/toast-store';
import { selectBakeryAction } from '@/app/actions/bakery-selection';

// Constants
const DROPDOWN_CLOSE_DELAY_MS = 200;
const TOAST_DURATION_PERSISTENT = 0;

interface Bakery {
  id: string;
  name: string;
}

interface BakerySelectorProps {
  bakeries: Bakery[];
  currentBakeryId: string | null;
}

export function BakerySelector({ bakeries, currentBakeryId }: BakerySelectorProps) {
  const [pendingBakeryId, setPendingBakeryId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { addToast } = useToastStore();
  const warningToastIdRef = useRef<string | null>(null);

  // Handle bakery selection using secure server action
  useEffect(() => {
    if (pendingBakeryId) {
      selectBakeryAction(pendingBakeryId)
        .then((result) => {
          if (!result.success) {
            addToast(result.error || 'Failed to update bakery selection', 'error');
          }
          // Page will refresh via revalidatePath in server action
        })
        .catch(() => {
          addToast('Failed to update bakery selection', 'error');
        })
        .finally(() => {
          setPendingBakeryId(null);
        });
    }
  }, [pendingBakeryId, addToast]);

  // Show toast notification if no bakery is selected (only once)
  useEffect(() => {
    if (bakeries.length > 0 && !currentBakeryId && !warningToastIdRef.current) {
      // Show persistent warning toast
      const toastId = addToast('Please select a bakery to continue', 'warning', TOAST_DURATION_PERSISTENT);
      warningToastIdRef.current = toastId;
    } else if (currentBakeryId && warningToastIdRef.current) {
      // Clear the ref when bakery is selected (toast will auto-clear on next render)
      warningToastIdRef.current = null;
    }
  }, [bakeries.length, currentBakeryId, addToast]);

  // Don't show if no bakeries assigned
  if (bakeries.length === 0) {
    return null;
  }

  const currentBakery = currentBakeryId ? bakeries.find(b => b.id === currentBakeryId) : null;

  const handleBakeryChange = async (bakeryId: string) => {
    setPendingBakeryId(bakeryId);
  };

  return (
    <div className="px-6 py-3 border-b border-base-300">
      <div className="dropdown dropdown-bottom w-full">
        <div
          tabIndex={0}
          role="button"
          className={`btn btn-sm w-full justify-between normal-case font-normal ${!currentBakery ? 'btn-warning' : 'btn-ghost'}`}
          onClick={() => setIsOpen(!isOpen)}
          onBlur={() => setTimeout(() => setIsOpen(false), DROPDOWN_CLOSE_DELAY_MS)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {!currentBakery ? (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Building2 className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate text-sm">
              {currentBakery ? currentBakery.name : 'Select a bakery'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </div>

        <ul
          tabIndex={isOpen ? 0 : -1}
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
      </div>
    </div>
  );
}
