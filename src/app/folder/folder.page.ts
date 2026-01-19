import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApiService } from '../services/admin-api.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit {
  public folder!: string;
  private activatedRoute = inject(ActivatedRoute);
  
  dashboardStats: any = null;
  isLoading = false;

  // Recent activities
  recentActivities: any[] = [];

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
    if (this.isDashboard) {
      this.loadDashboard();
    }
  }

  get isDashboard(): boolean {
    return this.folder === 'dashboard';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private loadDashboard() {
    this.isLoading = true;
    this.adminApi.getDashboard().subscribe({
      next: (data) => {
        this.dashboardStats = {
          totalUsers: data?.stats?.totalUsers || 0,
          activeDrivers: data?.stats?.activeDrivers || 0,
          totalRides: data?.stats?.totalRides || 0,
          revenue: data?.revenue?.totalPlatformEarnings || 0,
          pendingRequests: data?.stats?.pendingDrivers || 0,
          completedRides: data?.stats?.completedRides || 0
        };
        this.recentActivities = data?.recentActivities || [];
        this.isLoading = false;
      },
      error: () => {
        this.dashboardStats = {
          totalUsers: 0,
          activeDrivers: 0,
          totalRides: 0,
          revenue: 0,
          pendingRequests: 0,
          completedRides: 0
        };
        this.recentActivities = [];
        this.isLoading = false;
      }
    });
  }
}
