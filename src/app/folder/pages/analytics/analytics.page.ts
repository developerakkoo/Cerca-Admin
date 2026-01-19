import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../../services/admin-api.service';

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

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.isLoading = true;
    this.adminApi.getDashboard().subscribe({
      next: (data) => {
        this.dashboardStats = data?.stats || null;
      },
      error: () => {
        this.dashboardStats = null;
      }
    });

    this.adminApi.getEarnings({ groupBy: 'month' }).subscribe({
      next: (data) => {
        this.earnings = data || null;
        this.isLoading = false;
      },
      error: () => {
        this.earnings = null;
        this.isLoading = false;
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value || 0);
  }
}

