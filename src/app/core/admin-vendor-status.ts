/**
 * Admin vendor verification display — aligned with backend serializeVendorForResponse
 * (vendorReviewStatus, status, isVerified).
 */

export type VendorLike = {
  isVerified?: boolean;
  vendorReviewStatus?: string;
  status?: string;
  approvalStatus?: string;
};

export function isVendorRejected(v: VendorLike | null | undefined): boolean {
  if (!v) return false;
  const raw = v.vendorReviewStatus ?? v.status ?? v.approvalStatus ?? '';
  return String(raw).toUpperCase() === 'REJECTED';
}

/** Awaiting review: not verified and not rejected. */
export function isVendorPendingReview(v: VendorLike | null | undefined): boolean {
  if (!v) return false;
  if (v.isVerified) return false;
  return !isVendorRejected(v);
}

/** Human-readable verification state (matches vendor detail hero). */
export function getVendorVerificationLabel(v: VendorLike | null | undefined): string {
  if (!v) return '—';
  if (v.isVerified) return 'Verified';
  if (isVendorRejected(v)) return 'Rejected';
  return 'Pending review';
}

/** Shorter label for dense tables. */
export function getVendorVerificationShortLabel(v: VendorLike | null | undefined): string {
  if (!v) return '—';
  if (v.isVerified) return 'Verified';
  if (isVendorRejected(v)) return 'Rejected';
  return 'Pending';
}

/** Ionic ion-badge color names. */
export function getVendorVerificationBadgeColor(
  v: VendorLike | null | undefined
): 'success' | 'danger' | 'warning' | 'medium' {
  if (!v) return 'medium';
  if (v.isVerified) return 'success';
  if (isVendorRejected(v)) return 'danger';
  return 'warning';
}
