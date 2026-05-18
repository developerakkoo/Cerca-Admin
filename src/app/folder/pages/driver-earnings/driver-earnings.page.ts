import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-driver-earnings',
  templateUrl: './driver-earnings.page.html',
  styleUrls: ['./driver-earnings.page.scss'],
  standalone: false,
})
export class DriverEarningsPage implements OnInit {
  earnings: any[] = [];
  stats: any = null;
  isLoading = false;
  error: string | null = null;

  driverId = '';
  driverFilterLabel = '';
  status = '';
  startDate = '';
  endDate = '';

  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;

  statusSelections: Record<string, string> = {};

  cashReceivables: any[] = [];
  cashReceivablesLoading = false;

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadEarnings();
  }

  ionViewWillEnter() {
    this.loadEarnings(this.currentPage);
    this.loadCashReceivables();
  }

  loadCashReceivables() {
    this.cashReceivablesLoading = true;
    const params: Record<string, string | number> = {};
    if (this.driverId) params['driverId'] = this.driverId;
    this.adminApi.getCashReceivables(params).subscribe({
      next: (res) => {
        this.cashReceivables = res?.data?.items || [];
        this.cashReceivablesLoading = false;
      },
      error: () => {
        this.cashReceivables = [];
        this.cashReceivablesLoading = false;
      },
    });
  }

  async confirmCollectCash(item: { earningId: string; amountDue?: number }) {
    const alert = await this.alertController.create({
      header: 'Record collection',
      message: `Mark platform fee ₹${item.amountDue ?? ''} as collected from driver?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => {
            this.adminApi.collectCashPlatformFee(item.earningId, {}).subscribe({
              next: async () => {
                const t = await this.toastController.create({
                  message: 'Collection recorded',
                  duration: 2000,
                  color: 'success',
                });
                await t.present();
                this.loadCashReceivables();
              },
              error: async (err) => {
                const t = await this.toastController.create({
                  message: err?.error?.message || 'Failed to record',
                  duration: 2500,
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

  loadEarnings(page: number = 1) {
    this.isLoading = true;
    this.error = null;
    this.currentPage = page;

    const params: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.driverId) params.driverId = this.driverId;
    if (this.status) params.status = this.status;
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

    this.adminApi.getDriverEarningsList(params).subscribe({
      next: (data) => {
        this.earnings = data?.data?.earnings || [];
        const pagination = data?.data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalEarnings: 0,
          limit: this.limit
        };
        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;
        this.total = pagination.totalEarnings;
        this.isLoading = false;

        this.statusSelections = {};
        this.earnings.forEach((earning) => {
          this.statusSelections[earning.id] = earning.paymentStatus;
        });
      },
      error: async (error) => {
        this.isLoading = false;
        this.error = error?.error?.message || 'Failed to load driver earnings';
        this.earnings = [];

        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error || 'An error occurred',
          buttons: [
            {
              text: 'Retry',
              handler: () => this.loadEarnings(this.currentPage)
            },
            { text: 'OK', role: 'cancel' }
          ]
        });
        await alert.present();
      }
    });

    const statsParams: Record<string, string> = {};
    if (this.startDate) statsParams['startDate'] = this.startDate;
    if (this.endDate) statsParams['endDate'] = this.endDate;

    this.adminApi.getDriverEarningsStats(statsParams).subscribe({
      next: (data) => {
        this.stats = data?.data || null;
      },
      error: () => {
        this.stats = null;
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadEarnings(1);
  }

  resetFilters() {
    this.driverId = '';
    this.driverFilterLabel = '';
    this.status = '';
    this.startDate = '';
    this.endDate = '';
    this.onFilterChange();
  }

  clearDriverFilter(): void {
    this.driverId = '';
    this.driverFilterLabel = '';
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
              .create({ message: 'No drivers matched.', color: 'warning', duration: 2500 })
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
                handler: () => this.applyDriverFilter(d),
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

  async updateStatus(earning: any) {
    const paymentStatus = this.statusSelections[earning.id];
    if (!paymentStatus || paymentStatus === earning.paymentStatus) {
      return;
    }

    this.adminApi.updateDriverEarningStatus(earning.id, { paymentStatus }).subscribe({
      next: async () => {
        earning.paymentStatus = paymentStatus;
        const toast = await this.toastController.create({
          message: 'Earning status updated',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        this.loadEarnings(this.currentPage);
      },
      error: async (error) => {
        const toast = await this.toastController.create({
          message: error?.error?.message || 'Failed to update status',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        this.statusSelections[earning.id] = earning.paymentStatus;
      }
    });
  }

  viewDriverEarnings(driverId: string) {
    this.router.navigate(['/folder/driver-earnings', driverId]);
  }

  exportCsv() {
    const headers = [
      'Earning ID',
      'Driver',
      'Ride ID',
      'Date',
      'Gross Fare',
      'Platform Fee',
      'Driver Earning',
      'Payment Status'
    ];
    const rows = this.earnings.map((earning) => [
      earning.id,
      earning.driver?.name || '',
      earning.rideId || '',
      this.formatDate(earning.rideDate),
      earning.grossFare || 0,
      earning.platformFee || 0,
      earning.driverEarning || 0,
      earning.paymentStatus || 'pending'
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'driver-earnings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const parsed = typeof date === 'string' ? new Date(date) : date;
    return parsed.toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }
}

