import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../../services/admin-api.service';
import { environment } from '../../../../../environments/environment';
import { vehicleApprovalBadgeColor } from '../../../../core/admin-vehicle-inventory';

@Component({
  selector: 'app-fleet-vehicle-detail',
  templateUrl: './fleet-vehicle-detail.page.html',
  styleUrls: ['./fleet-vehicle-detail.page.scss'],
  standalone: false,
})
export class FleetVehicleDetailPage implements OnInit {
  vehicleId = '';
  v: Record<string, unknown> | null = null;
  isLoading = false;
  error: string | null = null;

  rejectModalOpen = false;
  rejectReason = '';
  rejectAllowResubmit = false;

  badgeColor = vehicleApprovalBadgeColor;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.vehicleId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.vehicleId) {
      this.error = 'Vehicle ID missing';
      return;
    }
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = null;
    this.adminApi.getFleetVehicleById(this.vehicleId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.success && res.fleetVehicle) {
          this.v = res.fleetVehicle as Record<string, unknown>;
        } else {
          this.error = res?.message || 'Vehicle not found';
          this.v = null;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load vehicle';
        this.v = null;
      },
    });
  }

  str(key: string): string {
    const x = this.v?.[key];
    return x != null ? String(x) : '';
  }

  get vendor(): {
    _id?: string;
    businessName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
  } | null {
    const x = this.v?.['vendor'];
    return x && typeof x === 'object'
      ? (x as {
          _id?: string;
          businessName?: string;
          ownerName?: string;
          email?: string;
          phone?: string;
        })
      : null;
  }

  get assignedDriver(): { name?: string; phone?: string } | null {
    const x = this.v?.['assignedDriver'];
    return x && typeof x === 'object'
      ? (x as { name?: string; phone?: string })
      : null;
  }

  vendorId(): string | null {
    const id = this.vendor?._id;
    return id ? String(id) : null;
  }

  openVendor(): void {
    const id = this.vendorId();
    if (id) {
      this.router.navigate(['/folder/vendors/vendor', id]);
    }
  }

  openDocument(url: string | undefined): void {
    if (!url) return;
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const fullUrl = /^https?:\/\//i.test(url)
      ? url
      : base + (url.startsWith('/') ? url : '/' + url);
    window.open(fullUrl, '_blank');
  }

  docs(): { documentType?: string; documentUrl?: string }[] {
    const d = this.v?.['documents'];
    return Array.isArray(d) ? (d as { documentType?: string; documentUrl?: string }[]) : [];
  }

  async approve(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Approve fleet vehicle',
      message: 'Approve this vehicle for the vendor fleet?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.adminApi.approveFleetVehicle(this.vehicleId).subscribe({
              next: async () => {
                const t = await this.toastController.create({
                  message: 'Vehicle approved',
                  duration: 2000,
                  color: 'success',
                });
                await t.present();
                this.load();
              },
              error: async (err) => {
                const t = await this.toastController.create({
                  message: err?.error?.message || 'Could not approve',
                  duration: 4000,
                  color: 'danger',
                });
                await t.present();
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

  async confirmReject(): Promise<void> {
    const reason = this.rejectReason.trim();
    if (reason.length < 10) {
      const t = await this.toastController.create({
        message: 'Enter a reason (at least 10 characters).',
        duration: 3500,
        color: 'warning',
      });
      await t.present();
      return;
    }
    this.adminApi
      .rejectFleetVehicle(this.vehicleId, {
        reason,
        allowDocumentResubmit: this.rejectAllowResubmit,
      })
      .subscribe({
        next: async () => {
          const t = await this.toastController.create({
            message: 'Vehicle rejected',
            duration: 2000,
            color: 'warning',
          });
          await t.present();
          this.closeRejectModal();
          this.load();
        },
        error: async (err) => {
          const t = await this.toastController.create({
            message: err?.error?.message || 'Could not reject',
            duration: 4000,
            color: 'danger',
          });
          await t.present();
        },
      });
  }
}
