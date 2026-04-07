import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../../services/admin-api.service';
import { environment } from '../../../../../environments/environment';

/** Inline template avoids NG2008 when external .html is missing on disk (sync/IDE issues). */
const DRIVER_VEHICLE_DETAIL_TEMPLATE = `
<ion-header [translucent]="true" class="ion-no-border">
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-back-button defaultHref="/folder/vehicles"></ion-back-button>
    </ion-buttons>
    <ion-title>Driver vehicle</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true" class="ion-padding" *ngIf="!isLoading && driver">
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ driver.name }}</ion-card-title>
      <ion-card-subtitle *ngIf="driver.vehicleStatus">
        Vehicle status:
        <ion-badge
          [color]="
            driver.vehicleStatus === 'APPROVED'
              ? 'success'
              : driver.vehicleStatus === 'UNDER_APPROVAL'
                ? 'warning'
                : driver.vehicleStatus === 'REJECTED'
                  ? 'danger'
                  : 'medium'
          ">
          {{ driver.vehicleStatus }}
        </ion-badge>
      </ion-card-subtitle>
    </ion-card-header>
    <ion-card-content>
      <p *ngIf="driver.email"><strong>Email:</strong> {{ driver.email }}</p>
      <p *ngIf="driver.phone"><strong>Phone:</strong> {{ driver.phone }}</p>
      <p *ngIf="driver.vehicleInfo as vi">
        <strong>Approved vehicle:</strong>
        {{ vi.make }} {{ vi.model }} ({{ vi.licensePlate || 'N/A' }})
      </p>
    </ion-card-content>
  </ion-card>

  <div class="link-row">
    <ion-button expand="block" fill="outline" size="small" (click)="openFullProfile()">
      Open full driver profile
    </ion-button>
  </div>

  <ion-card *ngIf="driver.pendingVehicleInfo as pvi">
    <ion-card-header>
      <ion-card-title>Vehicle submission</ion-card-title>
      <ion-card-subtitle *ngIf="pvi.approvalStatus">
        {{ pvi.approvalStatus }}
        <span *ngIf="pvi.approvalRoutedTo"> · Routed to {{ pvi.approvalRoutedTo }}</span>
      </ion-card-subtitle>
    </ion-card-header>
    <ion-card-content>
      <p *ngIf="pvi.make || pvi.model">
        <strong>Vehicle:</strong> {{ pvi.make }} {{ pvi.model }}
        <span *ngIf="pvi.year"> ({{ pvi.year }})</span>
      </p>
      <p *ngIf="pvi.licensePlate"><strong>Plate:</strong> {{ pvi.licensePlate }}</p>
      <p *ngIf="pvi.rejectionReason"><strong>Rejection reason:</strong> {{ pvi.rejectionReason }}</p>
      <p *ngIf="vehiclePendingRoutedToVendor" class="ion-text-wrap" style="color: var(--ion-color-medium);">
        Awaiting vendor review first. The vendor forwards to admin after their check.
      </p>
      <p *ngIf="vehicleVendorForwardedToAdmin" class="ion-text-wrap" style="color: var(--ion-color-medium);">
        Vendor has pre-approved this submission. Use Approve or Reject below for the final decision.
      </p>
      <p
        *ngIf="pvi.allowDocumentResubmit && pvi.approvalStatus === 'REJECTED'"
        class="ion-text-wrap"
        style="color: var(--ion-color-medium);">
        Driver may re-upload vehicle documents when allowed by this rejection.
      </p>
      <ion-list *ngIf="pvi.documents?.length" lines="none">
        <ion-item
          *ngFor="let d of pvi.documents"
          button
          (click)="openVehicleDocumentUrl(d.documentUrl)"
          [disabled]="!d.documentUrl">
          <ion-icon name="document-outline" slot="start"></ion-icon>
          <ion-label>{{ d.documentType || 'Document' }}</ion-label>
          <ion-icon name="open-outline" slot="end"></ion-icon>
        </ion-item>
      </ion-list>
      <div *ngIf="canAdminActOnVehicle" class="ion-margin-top">
        <ion-button expand="block" color="success" size="small" (click)="approveDriverVehicle()">
          Approve vehicle
        </ion-button>
        <ion-button expand="block" color="medium" fill="outline" size="small" (click)="openVehicleRejectModal()">
          Reject vehicle
        </ion-button>
      </div>
    </ion-card-content>
  </ion-card>

  <ion-card *ngIf="!driver.pendingVehicleInfo">
    <ion-card-content>
      <p style="color: var(--ion-color-medium);">
        No pending vehicle submission. Use the full driver profile for approved vehicle documents if needed.
      </p>
    </ion-card-content>
  </ion-card>

  <ion-modal [isOpen]="vehicleRejectModalOpen" (didDismiss)="closeVehicleRejectModal()">
    <ng-template>
      <ion-header>
        <ion-toolbar>
          <ion-title>Reject vehicle</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closeVehicleRejectModal()">Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p class="ion-text-wrap" style="color: var(--ion-color-medium);">
          Reason is shown to the driver. Optionally allow them to submit new vehicle documents.
        </p>
        <ion-item lines="none">
          <ion-label position="stacked">
            Rejection reason <ion-text color="danger">*</ion-text> (min. 10 characters)
          </ion-label>
          <ion-textarea
            [(ngModel)]="vehicleRejectReason"
            rows="5"
            placeholder="Explain what needs to change"
            autoGrow="true">
          </ion-textarea>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox [(ngModel)]="vehicleRejectAllowResubmit" slot="start"></ion-checkbox>
          <ion-label class="ion-text-wrap">Allow driver to re-upload vehicle documents</ion-label>
        </ion-item>
        <ion-button expand="block" color="danger" (click)="confirmVehicleReject()">Reject vehicle</ion-button>
      </ion-content>
    </ng-template>
  </ion-modal>
</ion-content>

<div *ngIf="isLoading" class="ion-padding ion-text-center">
  <ion-spinner></ion-spinner>
  <p>Loading…</p>
</div>

<ion-card *ngIf="error && !isLoading" color="danger" class="ion-margin">
  <ion-card-content>
    <p>{{ error }}</p>
    <ion-button fill="outline" (click)="load()">Retry</ion-button>
  </ion-card-content>
</ion-card>
`;

@Component({
  selector: 'app-driver-vehicle-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: DRIVER_VEHICLE_DETAIL_TEMPLATE,
  styleUrls: ['./driver-vehicle-detail.page.scss'],
})
export class DriverVehicleDetailPage implements OnInit {
  driverId = '';
  /** Driver payload from admin API (typed loosely for template access). */
  driver: any = null;
  isLoading = false;
  error: string | null = null;

  vehicleRejectModalOpen = false;
  vehicleRejectReason = '';
  vehicleRejectAllowResubmit = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.driverId = this.route.snapshot.paramMap.get('driverId') || '';
    if (!this.driverId) {
      this.error = 'Driver ID missing';
      return;
    }
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = null;
    this.adminApi.getDriverDetails(this.driverId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res) {
          this.driver = res;
        } else {
          this.error = 'Driver not found';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load driver';
        this.driver = null;
      },
    });
  }

  /** Admin may approve only when submission is routed to admin. */
  get canAdminActOnVehicle(): boolean {
    const p = this.driver?.pendingVehicleInfo as
      | { approvalStatus?: string; approvalRoutedTo?: string }
      | undefined;
    return (
      p?.approvalStatus === 'UNDER_APPROVAL' && p?.approvalRoutedTo === 'ADMIN'
    );
  }

  get vehiclePendingRoutedToVendor(): boolean {
    const p = this.driver?.pendingVehicleInfo as
      | { approvalStatus?: string; approvalRoutedTo?: string }
      | undefined;
    return (
      p?.approvalStatus === 'UNDER_APPROVAL' && p?.approvalRoutedTo === 'VENDOR'
    );
  }

  get vehicleVendorForwardedToAdmin(): boolean {
    const p = this.driver?.pendingVehicleInfo as
      | {
          approvalStatus?: string;
          approvalRoutedTo?: string;
          vendorPreApprovedAt?: unknown;
        }
      | undefined;
    return (
      p?.approvalStatus === 'UNDER_APPROVAL' &&
      p?.approvalRoutedTo === 'ADMIN' &&
      !!p?.vendorPreApprovedAt
    );
  }

  openFullProfile(): void {
    this.router.navigate(['/folder/drivers/driver', this.driverId]);
  }

  openVehicleDocumentUrl(url: string | undefined): void {
    if (!url) return;
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const fullUrl = /^https?:\/\//i.test(url)
      ? url
      : base + (url.startsWith('/') ? url : '/' + url);
    window.open(fullUrl, '_blank');
  }

  async approveDriverVehicle(): Promise<void> {
    const name = String(this.driver?.name || 'Driver');
    const alert = await this.alertController.create({
      header: 'Approve vehicle',
      message: `Approve the submitted vehicle for ${name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.adminApi.approveDriverVehicle(this.driverId).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: 'Vehicle approved',
                  duration: 2000,
                  color: 'success',
                });
                await toast.present();
                this.load();
              },
              error: async (err) => {
                const toast = await this.toastController.create({
                  message: err?.error?.message || 'Could not approve vehicle',
                  duration: 4000,
                  color: 'danger',
                });
                await toast.present();
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  openVehicleRejectModal(): void {
    this.vehicleRejectReason = '';
    this.vehicleRejectAllowResubmit = false;
    this.vehicleRejectModalOpen = true;
  }

  closeVehicleRejectModal(): void {
    this.vehicleRejectModalOpen = false;
  }

  confirmVehicleReject(): void {
    const reason = this.vehicleRejectReason.trim();
    if (!reason || reason.length < 10) {
      void this.toastController
        .create({
          message: 'Please enter a rejection reason (at least 10 characters).',
          duration: 3500,
          color: 'warning',
        })
        .then((t) => t.present());
      return;
    }
    this.adminApi
      .rejectDriverVehicle(
        this.driverId,
        reason,
        this.vehicleRejectAllowResubmit
      )
      .subscribe({
        next: async () => {
          const toast = await this.toastController.create({
            message: 'Vehicle rejected',
            duration: 2000,
            color: 'warning',
          });
          await toast.present();
          this.closeVehicleRejectModal();
          this.load();
        },
        error: async (err) => {
          const toast = await this.toastController.create({
            message: err?.error?.message || 'Could not reject vehicle',
            duration: 4000,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }
}
