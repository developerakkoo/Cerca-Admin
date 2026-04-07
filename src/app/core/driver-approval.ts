export type DriverApprovalStatus =
  | 'PENDING_VENDOR'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'REJECTED';

export interface DriverApprovalWorkflow {
  status?: string | null;
  routedTo?: 'VENDOR' | 'ADMIN' | null;
  submittedAt?: string | null;
  vendorApprovedAt?: string | null;
  adminApprovedAt?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: 'VENDOR' | 'ADMIN' | null;
  rejectionReason?: string | null;
}

export type ComplianceDocumentType = 'AADHAAR' | 'DRIVING_LICENSE' | 'PAN';

export interface ComplianceDocumentPayload {
  documentType: ComplianceDocumentType;
  documentNumber: string;
  expiryDate?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
}

export interface ComplianceDocumentsBody {
  complianceDocuments: ComplianceDocumentPayload[];
}

export function approvalStatusLabel(status: string | undefined | null): string {
  switch (status) {
    case 'PENDING_VENDOR':
      return 'Pending Vendor Review';
    case 'PENDING_ADMIN':
      return 'Pending Admin Review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

export function approvalBadgeColor(status: string | undefined | null): string {
  switch (status) {
    case 'PENDING_VENDOR':
    case 'PENDING_ADMIN':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    default:
      return 'medium';
  }
}

/**
 * Admin final approve/reject when queue is with admin, or legacy independent unverified driver.
 * Vendor-linked without explicit status: do not show (assume vendor step first).
 */
export function canAdminFinalApproveOrReject(driver: {
  approvalStatus?: string;
  isVerified?: boolean;
  vendorId?: string | null;
}): boolean {
  if (driver.approvalStatus === 'PENDING_ADMIN') return true;
  if (driver.approvalStatus === 'PENDING_VENDOR') return false;
  if (driver.approvalStatus === 'APPROVED' || driver.approvalStatus === 'REJECTED') return false;
  if (driver.isVerified) return false;
  if (driver.vendorId) return false;
  return true;
}

export function formatApiErrorWithMissingDocs(err: unknown): string {
  const e = err as { error?: { message?: string; missingDocuments?: string[] } };
  const msg = e?.error?.message || 'Request failed';
  const missing = e?.error?.missingDocuments;
  if (Array.isArray(missing) && missing.length) {
    return `${msg} Missing: ${missing.join(', ')}.`;
  }
  return msg;
}
