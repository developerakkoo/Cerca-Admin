/** Human-readable labels for admin driver detail (no raw enums in UI). */

export interface DriverIdentityDocumentRow {
  documentUrl?: string;
  url?: string;
  documentName?: string;
  documentType?: string;
}

export function documentRowLabel(doc: DriverIdentityDocumentRow | null | undefined): string {
  if (!doc) return 'Document';
  const name = String(doc.documentName || '').trim();
  if (name) return name;
  return vehicleDocTypeLabel(doc.documentType) || 'Document';
}

export function vehicleStatusLabel(raw: string | null | undefined): string {
  const s = String(raw || '').toUpperCase();
  switch (s) {
    case 'APPROVED':
      return 'Approved';
    case 'UNDER_APPROVAL':
      return 'Under review';
    case 'REJECTED':
      return 'Rejected';
    case 'NOT_ADDED':
      return 'Not added';
    default:
      return raw?.replace(/_/g, ' ') || '—';
  }
}

export function vehicleStatusBadgeColor(
  raw: string | null | undefined
): 'success' | 'warning' | 'danger' | 'medium' {
  const s = String(raw || '').toUpperCase();
  if (s === 'APPROVED') return 'success';
  if (s === 'UNDER_APPROVAL') return 'warning';
  if (s === 'REJECTED') return 'danger';
  return 'medium';
}

export function workflowRoutedToLabel(raw: string | null | undefined): string {
  const s = String(raw || '').toUpperCase();
  if (s === 'VENDOR') return 'Vendor review';
  if (s === 'ADMIN') return 'Platform admin review';
  return raw || '—';
}

export function workflowRejectedByLabel(raw: string | null | undefined): string {
  const s = String(raw || '').toUpperCase();
  if (s === 'VENDOR' || s.includes('VENDOR')) return 'Vendor';
  if (s === 'ADMIN' || s.includes('ADMIN')) return 'Platform admin';
  return raw || '—';
}

export function vehicleDocTypeLabel(raw: string | null | undefined): string {
  const s = String(raw || '').toUpperCase().trim();
  switch (s) {
    case 'RC':
      return 'Registration certificate (RC)';
    case 'INSURANCE':
      return 'Insurance';
    case 'PERMIT':
      return 'Permit';
    case 'PUC':
      return 'PUC';
    case 'AADHAAR_CARD':
    case 'AADHAAR':
      return 'Aadhaar Card';
    case 'PAN_CARD':
    case 'PAN':
      return 'PAN Card';
    case 'DRIVING_LICENSE':
    case 'DL':
      return 'Driving License';
    default:
      return s ? s.replace(/_/g, ' ') : '';
  }
}

export function missingDocLabel(code: string): string {
  const u = String(code || '').toUpperCase().replace(/\s/g, '_');
  if (u === 'AADHAAR' || u === 'AADHAAR_CARD') return 'Aadhaar';
  if (u === 'DRIVING_LICENSE' || u === 'DL') return 'Driving license';
  if (u === 'PAN' || u === 'PAN_CARD') return 'PAN';
  return code;
}

export function formatInr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function payoutStatusLabel(status: string | null | undefined): string {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'PENDING':
      return 'Pending';
    case 'PROCESSING':
      return 'Processing';
    case 'COMPLETED':
      return 'Completed';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status || '—';
  }
}

export function payoutStatusColor(
  status: string | null | undefined
): 'success' | 'warning' | 'danger' | 'medium' {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED') return 'success';
  if (s === 'PENDING' || s === 'PROCESSING') return 'warning';
  if (s === 'FAILED' || s === 'CANCELLED') return 'danger';
  return 'medium';
}

export function rideStatusLabel(status: string | null | undefined): string {
  const s = String(status || '').toLowerCase();
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Rider object after populate('rider', ...). */
export function rideCustomerDisplay(rider: unknown): string {
  if (!rider || typeof rider !== 'object') return '—';
  const r = rider as { fullName?: string; phoneNumber?: string; email?: string };
  const name = String(r.fullName || '').trim();
  const phone = String(r.phoneNumber || '').trim();
  if (name && phone) return `${name} · ${phone}`;
  if (name) return name;
  if (phone) return phone;
  const email = String(r.email || '').trim();
  return email || '—';
}

export function isLikelyImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.split('?')[0].toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(lower);
}

export function garageVehicleStatusLabel(raw: string | null | undefined): string {
  return vehicleStatusLabel(raw);
}
