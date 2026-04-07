import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../../services/admin-api.service';
import { environment } from 'src/environments/environment';
import {
  getVendorVerificationBadgeColor,
  getVendorVerificationLabel,
} from '../../../../core/admin-vendor-status';

@Component({
  selector: 'app-vendor-detail',
  templateUrl: './vendor-detail.page.html',
  styleUrls: ['./vendor-detail.page.scss'],
  standalone: false,
})
export class VendorDetailPage implements OnInit {
  vendorId = '';
  vendor: any = null;
  /** Drivers under this vendor (from getVendorById — backend includes `drivers`, `driverCount`). */
  drivers: any[] = [];
  documents: string[] = [];
  isLoading = false;
  error: string | null = null;

  rejectModalOpen = false;
  rejectReason = '';
  rejectAllowResubmit = false;

  fleetVehicles: any[] = [];
  fleetLoading = false;

  fleetRejectModalOpen = false;
  fleetRejectVehicleId = '';
  fleetRejectReason = '';
  fleetRejectAllowResubmit = false;

  verificationLabel = getVendorVerificationLabel;
  verificationBadgeColor = getVendorVerificationBadgeColor;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.vendorId = this.route.snapshot.paramMap.get('id') || '';
    if (this.vendorId) {
      this.loadVendor();
    } else {
      this.error = 'Vendor ID missing';
    }
  }

  get hasBankAccount(): boolean {
    const b = this.vendor?.bankAccount;
    return !!(b?.accountNumber && b?.ifscCode && b?.accountHolderName && b?.bankName);
  }

  maskAccountNumber(num: string | undefined): string {
    if (!num || String(num).length < 4) return '—';
    const s = String(num);
    return '····' + s.slice(-4);
  }

  openVendorPayouts(): void {
    this.router.navigate(['/folder/payouts'], { queryParams: { vendorId: this.vendorId } });
  }

  loadVendor() {
    if (!this.vendorId) return;
    this.isLoading = true;
    this.error = null;
    this.adminApi.getVendorById(this.vendorId).subscribe({
      next: (data) => {
        this.vendor = data;
        this.drivers = data?.drivers || [];
        this.loadDocuments();
        this.loadFleetVehicles();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load vendor';
      },
    });
  }

  loadDocuments() {
    this.adminApi.getVendorDocuments(this.vendorId).subscribe({
      next: (data) => {
        this.documents = data?.documents || [];
      },
    });
  }

  loadFleetVehicles() {
    if (!this.vendorId) return;
    this.fleetLoading = true;
    this.adminApi.getFleetVehicles({ vendorId: this.vendorId }).subscribe({
      next: (res) => {
        this.fleetVehicles = res?.fleetVehicles || [];
        this.fleetLoading = false;
      },
      error: () => {
        this.fleetVehicles = [];
        this.fleetLoading = false;
      },
    });
  }

  fleetStatusColor(status: string | undefined): string {
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

  openFleetDocumentUrl(url: string | undefined) {
    if (!url) return;
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const fullUrl = /^https?:\/\//i.test(url)
      ? url
      : base + (url.startsWith('/') ? url : '/' + url);
    window.open(fullUrl, '_blank');
  }

  async approveFleetVehicle(fv: any) {
    const alert = await this.alertController.create({
      header: 'Approve fleet vehicle',
      message: `Approve ${fv?.licensePlate || 'this vehicle'}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.adminApi.approveFleetVehicle(fv._id).subscribe({
              next: async () => {
                await this.showToast('Fleet vehicle approved', 'success');
                this.loadFleetVehicles();
              },
              error: async (err) => {
                await this.showToast(err?.error?.message || 'Could not approve', 'danger');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  openFleetRejectModal(fv: any): void {
    this.fleetRejectVehicleId = fv?._id || '';
    this.fleetRejectReason = '';
    this.fleetRejectAllowResubmit = false;
    this.fleetRejectModalOpen = true;
  }

  closeFleetRejectModal(): void {
    this.fleetRejectModalOpen = false;
  }

  confirmFleetReject(): void {
    const reason = this.fleetRejectReason.trim();
    if (!reason) {
      void this.showToast('Please enter a rejection reason.', 'warning');
      return;
    }
    if (!this.fleetRejectVehicleId) return;
    this.adminApi
      .rejectFleetVehicle(this.fleetRejectVehicleId, {
        reason,
        allowDocumentResubmit: this.fleetRejectAllowResubmit,
      })
      .subscribe({
        next: async () => {
          await this.showToast('Fleet vehicle rejected', 'success');
          this.closeFleetRejectModal();
          this.loadFleetVehicles();
        },
        error: async (err) => {
          await this.showToast(err?.error?.message || 'Could not reject', 'danger');
        },
      });
  }

  openDocument(url: string) {
    window.open(url, '_blank');
  }

  async verifyVendor() {
    const alert = await this.alertController.create({
      header: 'Verify vendor',
      message: `Verify ${this.vendor?.businessName}? They will be able to log in to the vendor panel.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Verify',
          handler: () => {
            this.adminApi.verifyVendor(this.vendorId).subscribe({
              next: async () => {
                await this.showToast('Vendor verified successfully', 'success');
                this.loadVendor();
              },
              error: async (err) => {
                await this.showToast(err?.error?.message || 'Failed to verify', 'danger');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  openRejectModal(): void {
    this.rejectReason = '';
    this.rejectAllowResubmit = false;
    this.rejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.rejectModalOpen = false;
  }

  confirmReject(): void {
    const reason = this.rejectReason.trim();
    if (!reason) {
      void this.showToast('Please enter a rejection reason.', 'warning');
      return;
    }
    this.adminApi
      .rejectVendor(this.vendorId, reason, this.rejectAllowResubmit)
      .subscribe({
        next: async () => {
          await this.showToast('Vendor rejected', 'success');
          this.closeRejectModal();
          this.loadVendor();
        },
        error: async (err) => {
          await this.showToast(err?.error?.message || 'Failed to reject', 'danger');
        },
      });
  }

  blockVendor() {
    this.adminApi.blockVendor(this.vendorId).subscribe({
      next: async () => {
        await this.showToast('Vendor blocked', 'success');
        this.loadVendor();
      },
      error: async (err) => {
        await this.showToast(err?.error?.message || 'Failed to block', 'danger');
      },
    });
  }

  unblockVendor() {
    this.adminApi.unblockVendor(this.vendorId).subscribe({
      next: async () => {
        await this.showToast('Vendor unblocked', 'success');
        this.loadVendor();
      },
      error: async (err) => {
        await this.showToast(err?.error?.message || 'Failed to unblock', 'danger');
      },
    });
  }

  goBack() {
    this.router.navigate(['/folder/vendors']);
  }

  /** Count from API or local array length. */
  get driverCount(): number {
    const n = this.vendor?.driverCount ?? this.vendor?.totalDrivers;
    if (typeof n === 'number' && !Number.isNaN(n)) return n;
    return this.drivers?.length ?? 0;
  }

  openDriverDetail(driver: any): void {
    const id = driver?.id ?? driver?._id;
    if (!id) return;
    this.router.navigate(['/folder/drivers/driver', id]);
  }

  getDriverInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2000, color });
    await toast.present();
  }
}
