/** Unified admin vehicle inventory row from GET /admin/vehicles */

export type VehicleRecordType = 'VENDOR_FLEET' | 'DRIVER_PERSONAL';

export type VehicleApprovalStatus = 'APPROVED' | 'UNDER_APPROVAL' | 'REJECTED';

export interface AdminVehicleDocument {
  documentType?: string;
  documentUrl?: string;
  [key: string]: unknown;
}

export interface AdminVehicleDriverSummary {
  _id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
  isOnline?: boolean;
  vendorId?: string | null;
}

export interface AdminVehicleVendorSummary {
  _id?: string;
  businessName?: string;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
}

export interface AdminVehicleInventoryRow {
  _id: string;
  vehicleRecordType: VehicleRecordType;
  driverId?: string | null;
  fleetVehicleId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  licensePlate?: string | null;
  vehicleType?: string | null;
  documents?: AdminVehicleDocument[];
  approvalStatus: VehicleApprovalStatus | string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  allowDocumentResubmit?: boolean;
  approvalRoutedTo?: string | null;
  vendor: AdminVehicleVendorSummary | null;
  assignedDriver: AdminVehicleDriverSummary | null;
  assignedDriverCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminVehicleInventoryResponse {
  success: boolean;
  message?: string;
  totalVehicles: number;
  fleetVehicleCount: number;
  standaloneVehicleCount: number;
  vehicles: AdminVehicleInventoryRow[];
}

export function vehicleApprovalBadgeColor(
  status: string | undefined | null
): string {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'UNDER_APPROVAL':
      return 'warning';
    case 'REJECTED':
      return 'danger';
    default:
      return 'medium';
  }
}
