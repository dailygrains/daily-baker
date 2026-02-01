'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeProductionSheet } from '@/app/actions/productionSheet';
import { CheckCircle2 } from 'lucide-react';

type CompleteProductionSheetButtonProps = {
  productionSheetId: string;
};

export function CompleteProductionSheetButton({
  productionSheetId,
}: CompleteProductionSheetButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    // Confirm action
    if (
      !confirm(
        'Are you sure you want to mark this production sheet as completed? This will deduct ingredients from inventory and cannot be undone.'
      )
    ) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await completeProductionSheet({ id: productionSheetId });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Failed to complete production sheet');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleComplete}
        className="btn btn-success btn-sm"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Completing...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Mark Completed
          </>
        )}
      </button>
    </div>
  );
}
