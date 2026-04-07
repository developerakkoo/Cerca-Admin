import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
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
  status = '';
  startDate = '';
  endDate = '';

  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;

  statusSelections: Record<string, string> = {};

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadEarnings();
  }

  ionViewWillEnter() {
    this.loadEarnings(this.currentPage);
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
    this.status = '';
    this.startDate = '';
    this.endDate = '';
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

