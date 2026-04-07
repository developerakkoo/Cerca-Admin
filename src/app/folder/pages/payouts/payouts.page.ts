import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-payouts',
  templateUrl: './payouts.page.html',
  styleUrls: ['./payouts.page.scss'],
  standalone: false,
})
export class PayoutsPage implements OnInit {
  payoutTab: 'driver' | 'vendor' = 'driver';

  payouts: any[] = [];
  isLoading = false;
  error: string | null = null;

  status = '';
  driverId = '';
  vendorFilterId = '';

  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;

  summary = {
    pendingAmount: 0,
    totalProcessed: 0,
    pendingCount: 0,
  };

  isProcessingModalOpen = false;
  processingPayout: any = null;
  processingForm = {
    status: 'PROCESSING',
    transactionId: '',
    transactionReference: '',
    failureReason: '',
    notes: '',
  };

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const v = this.route.snapshot.queryParamMap.get('vendorId');
    if (v) {
      this.payoutTab = 'vendor';
      this.vendorFilterId = v;
    }
    this.loadPayouts();
  }

  onTabChange() {
    this.currentPage = 1;
    this.error = null;
    this.payouts = [];
    this.loadPayouts(1);
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
    this.vendorFilterId = '';
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

  submitProcessingForm() {
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
          duration: 2000,
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
      message: body.replace(/\n/g, '<br/>'),
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
}
