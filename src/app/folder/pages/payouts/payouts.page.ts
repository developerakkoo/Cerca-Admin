import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-payouts',
  templateUrl: './payouts.page.html',
  styleUrls: ['./payouts.page.scss'],
  standalone: false,
})
export class PayoutsPage implements OnInit, OnDestroy {
  payoutTab: 'driver' | 'vendor' = 'driver';

  payouts: any[] = [];
  isLoading = false;
  error: string | null = null;

  status = '';
  driverId = '';
  /** Shown in chip — not an ObjectId. */
  driverFilterLabel = '';
  vendorFilterId = '';
  vendorFilterLabel = '';

  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;

  summary = {
    pendingAmount: 0,
    totalProcessed: 0,
    pendingCount: 0,
  };

  highlightPayoutId = '';

  isProcessingModalOpen = false;
  processingPayout: any = null;
  processingForm = {
    status: 'PROCESSING',
    transactionId: '',
    transactionReference: '',
    failureReason: '',
    notes: '',
  };

  private querySub?: Subscription;

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.querySub = this.route.queryParamMap.subscribe(() => {
      this.applyRouteQueryParams();
      this.loadPayouts(1);
    });
  }

  ngOnDestroy() {
    this.querySub?.unsubscribe();
  }

  private applyRouteQueryParams() {
    const m = this.route.snapshot.queryParamMap;
    const tab = m.get('tab');
    if (tab === 'vendor') {
      this.payoutTab = 'vendor';
    } else if (tab === 'driver') {
      this.payoutTab = 'driver';
    }
    const v = m.get('vendorId');
    if (v) {
      this.payoutTab = 'vendor';
      this.vendorFilterId = v;
      this.resolveVendorFilterLabel(v);
    }
    this.highlightPayoutId = m.get('payoutId') || '';
  }

  onTabChange() {
    this.highlightPayoutId = '';
    this.driverId = '';
    this.driverFilterLabel = '';
    this.vendorFilterId = '';
    this.vendorFilterLabel = '';
    this.currentPage = 1;
    this.error = null;
    this.payouts = [];
    this.loadPayouts(1);
  }

  private resolveVendorFilterLabel(vendorId: string): void {
    this.adminApi.getVendorById(vendorId).subscribe({
      next: (res) => {
        const ven = res?.vendor;
        this.vendorFilterLabel = ven?.businessName
          ? String(ven.businessName)
          : 'Selected vendor';
      },
      error: () => {
        this.vendorFilterLabel = 'Selected vendor';
      },
    });
  }

  clearDriverFilter(): void {
    this.driverId = '';
    this.driverFilterLabel = '';
    this.onFilterChange();
  }

  clearVendorFilter(): void {
    this.vendorFilterId = '';
    this.vendorFilterLabel = '';
    this.onFilterChange();
  }

  async openDriverFilterPicker(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Filter by driver',
      message: 'Search by phone or email:',
      inputs: [{ name: 'query', type: 'text', placeholder: 'Phone or email' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Search',
          handler: (data) => {
            const q = String(data?.query ?? '').trim();
            if (!q) {
              this.toastController
                .create({ message: 'Enter phone or email', color: 'warning', duration: 2000 })
                .then((t) => t.present());
              return false;
            }
            void this.runDriverSearchForFilter(q);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async runDriverSearchForFilter(query: string): Promise<void> {
    const loader = await this.loadingController.create({ message: 'Searching…' });
    await loader.present();
    this.adminApi
      .getDrivers({ search: query, page: 1, limit: 25, includeVendor: true })
      .subscribe({
        next: async (res) => {
          await loader.dismiss().catch(() => undefined);
          const raw = res?.drivers || [];
          const qLower = query.toLowerCase();
          const digitQ = query.replace(/\D/g, '');
          let matches = raw;
          if (query.includes('@')) {
            matches = raw.filter(
              (d: { email?: string }) => String(d?.email || '').toLowerCase() === qLower
            );
          } else if (digitQ.length >= 4) {
            matches = raw.filter((d: { phone?: string }) =>
              String(d?.phone || '')
                .replace(/\D/g, '')
                .includes(digitQ)
            );
          }
          if (!matches.length) {
            this.toastController
              .create({
                message: 'No drivers matched.',
                color: 'warning',
                duration: 2500,
              })
              .then((t) => t.present());
            return;
          }
          if (matches.length === 1) {
            this.applyDriverFilter(matches[0]);
            return;
          }
          const pick = await this.alertController.create({
            header: 'Select driver',
            message: 'Multiple matches:',
            buttons: [
              ...matches.slice(0, 10).map((d: { _id: string; name?: string; phone?: string }) => ({
                text: `${d.name || 'Driver'} · ${d.phone || '—'}`,
                handler: () => {
                  this.applyDriverFilter(d);
                },
              })),
              { text: 'Cancel', role: 'cancel' },
            ],
          });
          await pick.present();
        },
        error: async () => {
          await loader.dismiss().catch(() => undefined);
          this.toastController
            .create({ message: 'Search failed', color: 'danger', duration: 2500 })
            .then((t) => t.present());
        },
      });
  }

  private applyDriverFilter(d: { _id: string; name?: string; phone?: string }): void {
    this.driverId = String(d._id);
    this.driverFilterLabel = `${d.name || 'Driver'} · ${d.phone || '—'}`;
    this.onFilterChange();
  }

  async openVendorFilterPicker(): Promise<void> {
    const loader = await this.loadingController.create({ message: 'Loading vendors…' });
    await loader.present();
    this.adminApi.getVendors().subscribe({
      next: async (data) => {
        await loader.dismiss().catch(() => undefined);
        const list = data?.vendors || [];
        const searchAlert = await this.alertController.create({
          header: 'Filter by vendor',
          message: 'Search by business name, email, or phone:',
          inputs: [{ name: 'q', type: 'text', placeholder: 'Type to search' }],
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Search',
              handler: (d) => {
                const q = String(d?.q ?? '').trim().toLowerCase();
                const matches = !q
                  ? list.slice(0, 15)
                  : list.filter(
                      (v: any) =>
                        String(v.businessName || '')
                          .toLowerCase()
                          .includes(q) ||
                        String(v.email || '')
                          .toLowerCase()
                          .includes(q) ||
                        String(v.phone || '').includes(q)
                    );
                void this.presentVendorPickMatches(matches.slice(0, 12));
                return true;
              },
            },
          ],
        });
        await searchAlert.present();
      },
      error: async () => {
        await loader.dismiss().catch(() => undefined);
        this.toastController
          .create({ message: 'Could not load vendors', color: 'danger', duration: 2500 })
          .then((t) => t.present());
      },
    });
  }

  private async presentVendorPickMatches(matches: any[]): Promise<void> {
    if (!matches.length) {
      this.toastController
        .create({ message: 'No vendors matched.', color: 'warning', duration: 2500 })
        .then((t) => t.present());
      return;
    }
    if (matches.length === 1) {
      this.applyVendorFilter(matches[0]);
      return;
    }
    const pick = await this.alertController.create({
      header: 'Select vendor',
      buttons: [
        ...matches.map((v: any) => ({
          text: `${v.businessName || 'Vendor'} · ${v.phone || v.email || '—'}`,
          handler: () => this.applyVendorFilter(v),
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await pick.present();
  }

  private applyVendorFilter(v: { _id: string; businessName?: string; phone?: string; email?: string }): void {
    this.vendorFilterId = String(v._id);
    this.vendorFilterLabel = `${v.businessName || 'Vendor'} · ${v.phone || v.email || '—'}`;
    this.onFilterChange();
  }

  loadPayouts(page: number = 1) {
    this.isLoading = true;
    this.error = null;
    this.currentPage = page;

    const params: Record<string, string | number> = {
      page: this.currentPage,
      limit: this.limit,
    };

    if (this.status) params['status'] = this.status;

    if (this.payoutTab === 'driver') {
      if (this.driverId) params['driverId'] = this.driverId;
      this.adminApi.getPayouts(params).subscribe({
        next: (data) => this.applyPayoutList(data),
        error: (error) => this.handleLoadError(error),
      });
    } else {
      if (this.vendorFilterId) params['vendorId'] = this.vendorFilterId;
      this.adminApi.getVendorPayouts(params).subscribe({
        next: (data) => this.applyPayoutList(data),
        error: (error) => this.handleLoadError(error),
      });
    }
  }

  private applyPayoutList(data: any) {
    this.payouts = data?.payouts || [];
    const pagination = data?.pagination || {
      currentPage: 1,
      totalPages: 1,
      total: 0,
      limit: this.limit,
    };
    this.currentPage = pagination.currentPage;
    this.totalPages = pagination.totalPages;
    this.total = pagination.total;
    this.isLoading = false;
    this.calculateSummary();
  }

  private async handleLoadError(error: any) {
    this.isLoading = false;
    this.error = error?.error?.message || 'Failed to load payouts';
    this.payouts = [];
    const alert = await this.alertController.create({
      header: 'Error',
      message: this.error || 'An error occurred',
      buttons: [
        { text: 'Retry', handler: () => this.loadPayouts(this.currentPage) },
        { text: 'OK', role: 'cancel' },
      ],
    });
    await alert.present();
  }

  calculateSummary() {
    const pending = this.payouts.filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING');
    const completed = this.payouts.filter((p) => p.status === 'COMPLETED');
    this.summary = {
      pendingAmount: pending.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalProcessed: completed.reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingCount: pending.length,
    };
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadPayouts(1);
  }

  resetFilters() {
    this.status = '';
    this.driverId = '';
    this.driverFilterLabel = '';
    this.vendorFilterId = '';
    this.vendorFilterLabel = '';
    this.highlightPayoutId = '';
    this.onFilterChange();
  }

  processPayout(payout: any) {
    this.processingPayout = payout;
    this.processingForm = {
      status: payout?.status || 'PROCESSING',
      transactionId: payout?.transactionId || '',
      transactionReference: payout?.transactionReference || '',
      failureReason: payout?.failureReason || '',
      notes: payout?.notes || '',
    };
    this.isProcessingModalOpen = true;
  }

  closeProcessingModal() {
    this.isProcessingModalOpen = false;
    this.processingPayout = null;
  }

  async submitProcessingForm() {
    if (!this.processingPayout?._id) return;

    if (
      this.payoutTab === 'vendor' &&
      this.processingForm.status === 'COMPLETED' &&
      this.processingPayout.status !== 'COMPLETED'
    ) {
      const amount = this.processingPayout.amount || 0;
      const alert = await this.alertController.create({
        header: 'Complete vendor payout?',
        message: `This deducts ${this.formatCurrency(amount)} from the vendor wallet. This cannot be undone from the app.`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Complete',
            role: 'confirm',
            handler: () => this.doSubmitProcessingForm(),
          },
        ],
      });
      await alert.present();
      return;
    }

    this.doSubmitProcessingForm();
  }

  private doSubmitProcessingForm() {
    if (!this.processingPayout?._id) return;
    const payload = {
      status: this.processingForm.status,
      transactionId: this.processingForm.transactionId,
      transactionReference: this.processingForm.transactionReference,
      failureReason: this.processingForm.failureReason,
      notes: this.processingForm.notes,
    };
    this.submitPayoutUpdate(this.processingPayout._id, payload);
    this.closeProcessingModal();
  }

  submitPayoutUpdate(payoutId: string, payload: any) {
    const allowed = ['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    if (!payload?.status || !allowed.includes(payload.status)) {
      this.toastController
        .create({
          message: 'Select a valid payout status',
          duration: 2000,
          color: 'warning',
        })
        .then((toast) => toast.present());
      return;
    }

    const req =
      this.payoutTab === 'driver'
        ? this.adminApi.processPayout(payoutId, payload)
        : this.adminApi.processVendorPayout(payoutId, payload);

    req.subscribe({
      next: async () => {
        const toast = await this.toastController.create({
          message: 'Payout updated',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
        this.loadPayouts(this.currentPage);
      },
      error: async (error) => {
        const toast = await this.toastController.create({
          message: error?.error?.message || 'Failed to update payout',
          duration: 2500,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  async viewDetails(payout: any) {
    const bank = payout?.bankAccount || {};
    let body = '';
    if (this.payoutTab === 'driver') {
      body = `
Driver: ${payout?.driver?.name || 'N/A'} (${payout?.driver?.phone || ''})
Amount: ${this.formatCurrency(payout?.amount || 0)}
Status: ${payout?.status}
Holder: ${bank.accountHolderName || 'N/A'}
Bank: ${bank.bankName || 'N/A'}
Account: ${bank.accountNumber || 'N/A'} (${bank.ifscCode || ''})
Type: ${bank.accountType || 'N/A'}
Txn ID: ${payout?.transactionId || 'N/A'}
Reference: ${payout?.transactionReference || 'N/A'}
Notes: ${payout?.notes || 'N/A'}
Failure: ${payout?.failureReason || 'N/A'}
`;
    } else {
      const v = payout?.vendor;
      body = `
Vendor: ${v?.businessName || 'N/A'}
Email: ${v?.email || 'N/A'}
Phone: ${v?.phone || 'N/A'}
Amount: ${this.formatCurrency(payout?.amount || 0)}
Status: ${payout?.status}
Holder: ${bank.accountHolderName || 'N/A'}
Bank: ${bank.bankName || 'N/A'}
Account: ${bank.accountNumber || 'N/A'} (${bank.ifscCode || ''})
Type: ${bank.accountType || 'N/A'}
Txn ID: ${payout?.transactionId || 'N/A'}
Reference: ${payout?.transactionReference || 'N/A'}
Notes: ${payout?.notes || 'N/A'}
Failure: ${payout?.failureReason || 'N/A'}
`;
    }
    const alert = await this.alertController.create({
      header: this.payoutTab === 'driver' ? 'Driver payout' : 'Vendor payout',
      cssClass: 'payout-view-alert',
      message: body.trim(),
      buttons: ['OK'],
    });
    await alert.present();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const parsed = typeof date === 'string' ? new Date(date) : date;
    return parsed.toLocaleDateString('en-IN');
  }

  statusColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'primary';
      case 'FAILED':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'medium';
    }
  }

  trackByPayoutId(_index: number, p: any): string {
    return p?._id || String(_index);
  }

  isHighlighted(payout: any): boolean {
    if (!this.highlightPayoutId || !payout?._id) {
      return false;
    }
    return String(payout._id) === String(this.highlightPayoutId);
  }
}
