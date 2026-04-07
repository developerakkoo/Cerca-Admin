import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-driver-detail-earnings',
  templateUrl: './driver-detail-earnings.page.html',
  styleUrls: ['./driver-detail-earnings.page.scss'],
  standalone: false,
})
export class DriverDetailEarningsPage implements OnInit {
  driverId = '';
  driver: any = null;
  earnings: any[] = [];
  summary: any = null;
  isLoading = false;
  error: string | null = null;

  status = '';
  startDate = '';
  endDate = '';

  selectedEarnings = new Set<string>();
  bulkStatus = 'completed';

  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;

  constructor(
    private route: ActivatedRoute,
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.driverId = this.route.snapshot.paramMap.get('driverId') || '';
    this.loadEarnings();
  }

  loadEarnings(page: number = 1) {
    if (!this.driverId) return;
    this.isLoading = true;
    this.error = null;
    this.currentPage = page;

    const params: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.status) params.status = this.status;
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

    this.adminApi.getDriverEarningsByDriver(this.driverId, params).subscribe({
      next: (data) => {
        const response = data?.data || {};
        this.driver = response.driver || null;
        this.earnings = response.earnings || [];
        this.summary = response.summary || null;
        const pagination = response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalEarnings: 0,
          limit: this.limit
        };
        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;
        this.total = pagination.totalEarnings;
        this.isLoading = false;
        this.selectedEarnings.clear();
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
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadEarnings(1);
  }

  toggleSelect(earningId: string) {
    if (this.selectedEarnings.has(earningId)) {
      this.selectedEarnings.delete(earningId);
    } else {
      this.selectedEarnings.add(earningId);
    }
  }

  async bulkUpdateStatus() {
    if (this.selectedEarnings.size === 0) {
      const toast = await this.toastController.create({
        message: 'Select earnings to update',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.adminApi.bulkUpdateDriverEarningStatus({
      earningIds: Array.from(this.selectedEarnings),
      paymentStatus: this.bulkStatus
    }).subscribe({
      next: async () => {
        const toast = await this.toastController.create({
          message: 'Earnings updated',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        this.loadEarnings(this.currentPage);
      },
      error: async (error) => {
        const toast = await this.toastController.create({
          message: error?.error?.message || 'Failed to update earnings',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    });
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

