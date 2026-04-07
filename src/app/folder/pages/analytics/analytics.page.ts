import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../../services/admin-api.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: false,
})
export class AnalyticsPage implements OnInit {
  isLoading = false;
  dashboardStats: any = null;
  earnings: any = null;
  driverEarningsAnalytics: any = null;
  error: string | null = null;

  // Date filters
  startDate: string = '';
  endDate: string = '';
  groupBy: 'day' | 'week' | 'month' = 'month';

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.endDate = end.toISOString().split('T')[0];
    this.startDate = start.toISOString().split('T')[0];
    
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.isLoading = true;
    this.error = null;

    // Load dashboard stats
    this.adminApi.getDashboard({
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (data) => {
        this.dashboardStats = data?.stats || null;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.dashboardStats = null;
      }
    });

    // Load earnings
    const earningsParams: any = { groupBy: this.groupBy };
    if (this.startDate) earningsParams.startDate = this.startDate;
    if (this.endDate) earningsParams.endDate = this.endDate;

    this.adminApi.getEarnings(earningsParams).subscribe({
      next: (data) => {
        this.earnings = data || null;
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        this.error = error?.error?.message || 'Failed to load earnings data';
        this.earnings = null;
        
        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error || 'An error occurred',
          buttons: ['OK']
        });
        await alert.present();
      }
    });

    this.adminApi.getDriverEarningsAnalytics({
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (data) => {
        this.driverEarningsAnalytics = data?.data || null;
      },
      error: (error) => {
        console.error('Error loading driver earnings analytics:', error);
        this.driverEarningsAnalytics = null;
      }
    });
  }

  onDateFilterChange() {
    if (this.startDate && this.endDate) {
      if (new Date(this.startDate) > new Date(this.endDate)) {
        this.alertController.create({
          header: 'Invalid Date Range',
          message: 'Start date must be before end date',
          buttons: ['OK']
        }).then(alert => alert.present());
        return;
      }
      this.loadAnalytics();
    }
  }

  onGroupByChange() {
    this.loadAnalytics();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  formatPeriod(period: string): string {
    if (!period) return '';
    // Format based on groupBy
    if (this.groupBy === 'month') {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } else if (this.groupBy === 'week') {
      const date = new Date(period);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      const date = new Date(period);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
}

