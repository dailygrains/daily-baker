'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/store/toast-store';

type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

interface UseFormSubmitOptions {
  /** Whether this is a create or edit operation */
  mode: 'create' | 'edit';
  /** Display name of the entity (e.g., "Recipe", "Vendor") */
  entityName: string;
  /** Path to navigate to after successful create */
  listPath: string;
  /** Optional: Custom success message */
  successMessage?: string;
  /** Optional: Callback after successful submission */
  onSuccess?: (data?: unknown) => void;
}

interface UseFormSubmitReturn {
  /** Submit handler that wraps the action */
  submit: (
    action: () => Promise<ActionResult>,
    itemName?: string
  ) => Promise<boolean>;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Custom hook for handling form submissions with consistent behavior:
 * - Shows success/error toasts
 * - Only navigates to list on create, stays on page for edit
 * - Refreshes router data after success
 * - Manages loading and error state
 */
export function useFormSubmit({
  mode,
  entityName,
  listPath,
  successMessage,
  onSuccess,
}: UseFormSubmitOptions): UseFormSubmitReturn {
  const router = useRouter();
  const showToast = useToastStore((state) => state.addToast);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submit = useCallback(
    async (
      action: () => Promise<ActionResult>,
      itemName?: string
    ): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await action();

        if (result.success) {
          const message =
            successMessage ||
            (mode === 'create'
              ? `${entityName}${itemName ? ` "${itemName}"` : ''} created successfully`
              : `${entityName}${itemName ? ` "${itemName}"` : ''} updated successfully`);

          showToast(message, 'success');

          // Call optional success callback
          onSuccess?.(result.data);

          // Only redirect to list after creating, stay on page after editing
          if (mode === 'create') {
            router.push(listPath);
          }

          router.refresh();
          return true;
        } else {
          const errorMessage = result.error || `Failed to save ${entityName.toLowerCase()}`;
          setError(errorMessage);
          showToast(errorMessage, 'error');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, entityName, listPath, successMessage, onSuccess, router, showToast]
  );

  return {
    submit,
    isSubmitting,
    error,
    clearError,
  };
}
