const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export interface LotExpiryStatus {
  isExpired: boolean;
  /** Expires within the next 7 days. Never true for a lot that has already expired. */
  isExpiringSoon: boolean;
}

/**
 * Classify an inventory lot's expiration date relative to now.
 * Reads the clock, so call it from server components or event handlers, not client render.
 */
export function getLotExpiryStatus(expiresAt: Date | string | null | undefined): LotExpiryStatus {
  if (!expiresAt) {
    return { isExpired: false, isExpiringSoon: false };
  }

  const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
  const isExpired = msUntilExpiry < 0;

  return {
    isExpired,
    isExpiringSoon: !isExpired && msUntilExpiry < EXPIRING_SOON_MS,
  };
}
