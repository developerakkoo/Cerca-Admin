import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../../services/admin-api.service';
import { environment } from 'src/environments/environment';
import {
  approvalBadgeColor,
  approvalStatusLabel,
  canAdminFinalApproveOrReject,
  ComplianceDocumentPayload,
  formatApiErrorWithMissingDocs,
} from '../../../../core/driver-approval';
import {
  documentRowLabel,
  DriverIdentityDocumentRow,
  formatInr,
  garageVehicleStatusLabel,
  isLikelyImageUrl,
  missingDocLabel,
  payoutStatusColor,
  payoutStatusLabel,
  rideCustomerDisplay,
  rideStatusLabel,
  vehicleDocTypeLabel,
  vehicleStatusBadgeColor,
  vehicleStatusLabel,
  workflowRejectedByLabel,
  workflowRoutedToLabel,
} from '../../../../core/driver-detail-labels';

@Component({
  selector: 'app-driver-detail',
  templateUrl: './driver-detail.page.html',
  styleUrls: ['./driver-detail.page.scss'],
  standalone: false,
})
export class DriverDetailPage implements OnInit, OnDestroy {
  driverId = '';
  driver: any = null;
  documents: DriverIdentityDocumentRow[] = [];
  rides: any[] = [];
  payouts: any[] = [];
  isLoading = false;
  error: string | null = null;
  complianceForm!: FormGroup;
  savingCompliance = false;

  approvalLabel = approvalStatusLabel;
  approvalColor = approvalBadgeColor;
  canAdminFinalApproveOrReject = canAdminFinalApproveOrReject;

  docRowLabel = documentRowLabel;
  vStatusLabel = vehicleStatusLabel;
  vStatusColor = vehicleStatusBadgeColor;
  wfRoutedLabel = workflowRoutedToLabel;
  wfRejectedByLabel = workflowRejectedByLabel;
  vDocTypeLabel = vehicleDocTypeLabel;
  missDocLabel = missingDocLabel;
  inr = formatInr;
  payStatusLabel = payoutStatusLabel;
  payStatusColor = payoutStatusColor;
  rideStatLabel = rideStatusLabel;
  rideRiderLine = rideCustomerDisplay;
  imageUrl = isLikelyImageUrl;
  garageVStatusLabel = garageVehicleStatusLabel;

  vehicleRejectModalOpen = false;
  vehicleRejectReason = '';
  vehicleRejectAllowResubmit = false;

  private goToMap: any = null;
  private goToPolyline: any = null;
  private goToMarkers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private fb: FormBuilder
  ) {
    this.complianceForm = this.fb.group({
      aadhaarNumber: ['', Validators.required],
      aadhaarExpiry: [''],
      dlNumber: ['', Validators.required],
      dlExpiry: [''],
      panNumber: ['', Validators.required],
      panExpiry: [''],
    });
  }

  ngOnInit() {
    this.driverId = this.route.snapshot.paramMap.get('id') || '';
    if (this.driverId) {
      this.loadDriver();
    } else {
      this.error = 'Driver ID missing';
    }
  }

  ngOnDestroy(): void {
    this.destroyGoToMap();
  }

  goToStatusColor(goTo: Record<string, unknown> | null | undefined): string {
    if (!goTo) return 'medium';
    const status = String(goTo['status'] || '');
    if (status === 'ACTIVE') return 'success';
    if (status === 'STALE') return 'warning';
    return 'medium';
  }

  goToRoutePointCount(g: Record<string, unknown> | null | undefined): number {
    if (!g) return 0;
    const pts = g['routePoints'];
    if (Array.isArray(pts)) return pts.length;
    const n = g['routePointCount'];
    if (typeof n === 'number' && !Number.isNaN(n)) return n;
    return 0;
  }

  formatGoToDuration(seconds: number): string {
    if (seconds == null || Number.isNaN(seconds)) return '—';
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h} h ${rm} min`;
  }

  showGoToMap(): boolean {
    const g = this.driver?.goTo;
    if (!g) return false;
    const pts = g['routePoints'];
    if (Array.isArray(pts) && pts.length >= 2) return true;
    return this.goToPointFromGeo(g['homeLocation']) != null ||
      this.goToPointFromGeo(g['routeOrigin']) != null;
  }

  private goToPointFromGeo(geo: unknown): { lat: number; lng: number } | null {
    if (!geo || typeof geo !== 'object') return null;
    const c = (geo as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(c) || c.length < 2) return null;
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  private loadGoogleMaps(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    const w = window as any;
    if (w.google?.maps) return Promise.resolve();
    const key = environment.googleMapsApiKey || '';
    if (!key) return Promise.reject(new Error('Google Maps API key not set'));
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) {
        const check = () => {
          if (w.google?.maps) resolve();
          else setTimeout(check, 50);
        };
        check();
        return;
      }
      const callbackName = '__adminDriverGoToMapReady';
      w[callbackName] = () => {
        w[callbackName] = null;
        resolve();
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        w[callbackName] = null;
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
  }

  private destroyGoToMap(): void {
    this.goToMarkers.forEach((m) => m.setMap(null));
    this.goToMarkers = [];
    if (this.goToPolyline) {
      this.goToPolyline.setMap(null);
      this.goToPolyline = null;
    }
    this.goToMap = null;
  }

  private initGoToMap(): void {
    this.destroyGoToMap();
    if (!this.showGoToMap()) return;
    const el = document.getElementById('driver-goto-map');
    if (!el) return;

    const goTo = this.driver?.goTo;
    if (!goTo) return;

    const path: { lat: number; lng: number }[] = [];
    const rawPts = goTo['routePoints'];
    if (Array.isArray(rawPts)) {
      for (const pair of rawPts) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const lng = Number(pair[0]);
        const lat = Number(pair[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        path.push({ lat, lng });
      }
    }

    const home = this.goToPointFromGeo(goTo['homeLocation']);
    const origin = this.goToPointFromGeo(goTo['routeOrigin']);

    this.loadGoogleMaps()
      .then(() => {
        const el2 = document.getElementById('driver-goto-map');
        if (!el2 || !(window as any).google?.maps) return;
        const google = (window as any).google;

        const center = path[0] || home || origin || { lat: 19.076, lng: 72.8777 };
        this.goToMap = new google.maps.Map(el2, {
          center,
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        if (path.length >= 2) {
          this.goToPolyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#2563EB',
            strokeOpacity: 0.95,
            strokeWeight: 5,
            map: this.goToMap,
          });
        }

        const addMarker = (pos: { lat: number; lng: number }, title: string, color: string) => {
          const marker = new google.maps.Marker({
            position: pos,
            map: this.goToMap,
            title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
            },
          });
          this.goToMarkers.push(marker);
        };

        if (home) addMarker(home, 'Home', '#16A34A');
        if (origin && (!home || origin.lat !== home.lat || origin.lng !== home.lng)) {
          addMarker(origin, 'Route origin', '#CA8A04');
        }

        const bounds = new google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        if (home) bounds.extend(home);
        if (origin) bounds.extend(origin);

        if (path.length >= 2 || (home && origin)) {
          this.goToMap.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
        } else if (home || origin) {
          this.goToMap.setCenter(home || origin!);
          this.goToMap.setZoom(14);
        } else if (path.length === 1) {
          this.goToMap.setCenter(path[0]);
          this.goToMap.setZoom(14);
        }

        setTimeout(() => {
          if (this.goToMap) google.maps.event.trigger(this.goToMap, 'resize');
        }, 200);
      })
      .catch((err) => console.warn('Driver Go-To map load failed:', err));
  }

  loadDriver() {
    if (!this.driverId) return;
    this.isLoading = true;
    this.error = null;

    this.adminApi.getDriverDetails(this.driverId).subscribe({
      next: (data) => {
        this.driver = data?.driver || null;
        this.rides = data?.rides || [];
        this.payouts = data?.payouts || [];
        this.patchComplianceFromDriver();
        this.loadDocuments();
        this.isLoading = false;
        setTimeout(() => this.initGoToMap(), 150);
      },
      error: async (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load driver details';
      }
    });
  }

  loadDocuments() {
    this.adminApi.getDriverDocuments(this.driverId).subscribe({
      next: (data) => {
        const raw = data?.documents;
        if (!Array.isArray(raw)) {
          this.documents = [];
          return;
        }
        this.documents = raw
          .map((item: unknown) => {
            if (typeof item === 'string') {
              return { documentUrl: item } as DriverIdentityDocumentRow;
            }
            if (item && typeof item === 'object') {
              const o = item as DriverIdentityDocumentRow;
              return {
                documentUrl: String(o.documentUrl || o.url || '').trim(),
                documentName: o.documentName,
                documentType: o.documentType,
              };
            }
            return { documentUrl: '' };
          })
          .filter((d) => d.documentUrl);
      },
    });
  }

  /** Populated vendor subdocument from API, if present. */
  get vendorRecord(): Record<string, unknown> | null {
    const v = this.driver?.vendorId;
    if (v && typeof v === 'object' && (v as { businessName?: string }).businessName) {
      return v as Record<string, unknown>;
    }
    return null;
  }

  get hasVendorLink(): boolean {
    const v = this.driver?.vendorId;
    if (v == null) return false;
    if (typeof v === 'object') return true;
    return String(v).trim().length > 0;
  }

  identityPreviewUrl(doc: DriverIdentityDocumentRow): string | null {
    const href = this.documentHref(doc);
    if (!href || !isLikelyImageUrl(href)) return null;
    return this.absolutizeAssetUrl(href);
  }

  /** Public for template: absolute URL for uploaded assets. */
  assetUrl(url: string | undefined | null): string {
    if (!url) return '';
    return this.absolutizeAssetUrl(String(url).trim());
  }

  private absolutizeAssetUrl(url: string): string {
    const u = url.trim();
    if (/^https?:\/\//i.test(u)) return u;
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return base + (u.startsWith('/') ? u : '/' + u);
  }

  patchComplianceFromDriver() {
    const list = this.driver?.complianceDocuments;
    if (!Array.isArray(list)) return;
    const byType = (t: string) =>
      list.find(
        (d: { documentType?: string }) =>
          String(d?.documentType || '').toUpperCase().replace(/\s/g, '_') === t
      );
    const a = byType('AADHAAR');
    const dl = byType('DRIVING_LICENSE');
    const pan = byType('PAN');
    this.complianceForm.patchValue({
      aadhaarNumber: a?.documentNumber ?? '',
      aadhaarExpiry: a?.expiryDate ? String(a.expiryDate).slice(0, 10) : '',
      dlNumber: dl?.documentNumber ?? '',
      dlExpiry: dl?.expiryDate ? String(dl.expiryDate).slice(0, 10) : '',
      panNumber: pan?.documentNumber ?? '',
      panExpiry: pan?.expiryDate ? String(pan.expiryDate).slice(0, 10) : '',
    });
  }

  private isoEndOfDay(dateStr: string): string | undefined {
    const s = dateStr?.trim();
    if (!s) return undefined;
    const d = new Date(s + 'T12:00:00.000Z');
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }

  saveCompliance() {
    if (!this.driverId || this.complianceForm.invalid) {
      this.complianceForm.markAllAsTouched();
      return;
    }
    const v = this.complianceForm.getRawValue();
    const complianceDocuments: ComplianceDocumentPayload[] = [
      {
        documentType: 'AADHAAR',
        documentNumber: v.aadhaarNumber.trim(),
        expiryDate: this.isoEndOfDay(v.aadhaarExpiry) ?? undefined,
      },
      {
        documentType: 'DRIVING_LICENSE',
        documentNumber: v.dlNumber.trim(),
        expiryDate: this.isoEndOfDay(v.dlExpiry) ?? undefined,
      },
      {
        documentType: 'PAN',
        documentNumber: v.panNumber.trim(),
        expiryDate: this.isoEndOfDay(v.panExpiry) ?? undefined,
      },
    ];
    this.savingCompliance = true;
    this.adminApi.putDriverCompliance(this.driverId, { complianceDocuments }).subscribe({
      next: async () => {
        this.savingCompliance = false;
        const toast = await this.toastController.create({
          message: 'Compliance documents saved',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
        this.loadDriver();
      },
      error: async (err) => {
        this.savingCompliance = false;
        const toast = await this.toastController.create({
          message: formatApiErrorWithMissingDocs(err),
          duration: 4000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  async confirmResetVerification() {
    const alert = await this.alertController.create({
      header: 'Reset to pending',
      message:
        'This sets verification off and returns the driver to pending approval (vendor-linked drivers go back to pending vendor). Continue?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.adminApi.verifyDriver(this.driverId, false).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: 'Driver reset to pending approval',
                  duration: 2000,
                  color: 'success',
                });
                await toast.present();
                this.loadDriver();
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: formatApiErrorWithMissingDocs(error),
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

  async approveDriver() {
    const alert = await this.alertController.create({
      header: 'Approve Driver',
      message: `Approve ${this.driver?.name}? They will be able to go online and accept rides.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.adminApi.approveDriver(this.driverId).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: 'Driver approved successfully',
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                this.loadDriver();
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: formatApiErrorWithMissingDocs(error),
                  duration: 4000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async rejectDriver() {
    const alert = await this.alertController.create({
      header: 'Reject Driver',
      message: 'Rejection reason is required. It will be shown to the driver.',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Enter rejection reason (required)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: (data) => {
            const reason = (data?.reason || '').trim();
            if (!reason || reason.length < 10) {
              void this.toastController
                .create({
                  message: 'Please enter a rejection reason (at least 10 characters).',
                  duration: 3500,
                  color: 'warning'
                })
                .then((t) => t.present());
              return false;
            }
            this.adminApi.rejectDriver(this.driverId, reason).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: 'Driver rejected successfully',
                  duration: 2000,
                  color: 'warning'
                });
                await toast.present();
                this.loadDriver();
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: formatApiErrorWithMissingDocs(error),
                  duration: 4000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  documentHref(doc: unknown): string {
    if (typeof doc === 'string') return doc;
    const o = doc as DriverIdentityDocumentRow;
    return String(o?.documentUrl || o?.url || '').trim();
  }

  openDocument(doc: unknown) {
    const url = this.documentHref(doc);
    if (!url) return;
    window.open(this.absolutizeAssetUrl(url), '_blank');
  }

  openPriorityDocument() {
    if (!this.driverId) return;
    this.adminApi.getPriorityDocumentBlob(this.driverId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: async (err) => {
        const toast = await this.toastController.create({
          message: err?.error?.message || 'Failed to load document',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async approvePriorityDriver() {
    const alert = await this.alertController.create({
      header: 'Approve priority driver',
      message: `Approve ${this.driver?.name} as priority driver? They will receive ride requests first.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.adminApi.approvePriorityDriver(this.driverId).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: 'Priority driver approved successfully',
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                this.loadDriver();
              },
              error: async (err) => {
                const toast = await this.toastController.create({
                  message: err?.error?.message || 'Failed to approve priority driver',
                  duration: 2000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async rejectPriorityDriver() {
    const alert = await this.alertController.create({
      header: 'Reject priority application',
      message: 'Reject this priority application? The driver can re-apply later.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: () => {
            this.adminApi.rejectPriorityDriver(this.driverId).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: 'Priority application rejected',
                  duration: 2000,
                  color: 'warning'
                });
                await toast.present();
                this.loadDriver();
              },
              error: async (err) => {
                const toast = await this.toastController.create({
                  message: err?.error?.message || 'Failed to reject priority application',
                  duration: 2000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(['/folder/drivers']);
  }

  viewEarnings() {
    this.router.navigate(['/folder/driver-earnings', this.driverId]);
  }

  /** Admin may approve only when submission is routed to admin. */
  get canAdminActOnVehicle(): boolean {
    const p = this.driver?.pendingVehicleInfo;
    return (
      p?.approvalStatus === 'UNDER_APPROVAL' && p?.approvalRoutedTo === 'ADMIN'
    );
  }

  get vehiclePendingRoutedToVendor(): boolean {
    const p = this.driver?.pendingVehicleInfo;
    return (
      p?.approvalStatus === 'UNDER_APPROVAL' && p?.approvalRoutedTo === 'VENDOR'
    );
  }

  get vehicleVendorForwardedToAdmin(): boolean {
    const p = this.driver?.pendingVehicleInfo;
    return (
      p?.approvalStatus === 'UNDER_APPROVAL' &&
      p?.approvalRoutedTo === 'ADMIN' &&
      !!p?.vendorPreApprovedAt
    );
  }

  openVehicleDocumentUrl(url: string | undefined) {
    if (!url) return;
    window.open(this.absolutizeAssetUrl(url), '_blank');
  }

  async approveDriverVehicle() {
    const alert = await this.alertController.create({
      header: 'Approve vehicle',
      message: `Approve the submitted vehicle for ${this.driver?.name}?`,
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
                this.loadDriver();
              },
              error: async (err) => {
                const toast = await this.toastController.create({
                  message:
                    err?.error?.message || 'Could not approve vehicle',
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
          this.loadDriver();
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
