import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminApiService } from '../services/admin-api.service';
import { AdminSupportService } from '../services/admin-support.service';
import { AdminSocketService } from '../services/admin-socket.service';
import { AlertController, ViewWillEnter } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit, OnDestroy, ViewWillEnter {
  dashboardStats: any = {
    totalUsers: 0,
    activeDrivers: 0,
    driversOnline: 0,
    driversOffline: 0,
    totalRides: 0,
    pendingVehicles: 0,
    pendingDrivers: 0,
    pendingVendors: 0,
    completedRides: 0,
    cancelledRides: 0,
    activeEmergencies: 0,
  };
  supportStats: any = {
    waiting: 0,
    active: 0,
    resolved: 0,
    feedbackPending: 0,
    adminActiveChats: 0,
    averageRating: 0,
    totalIssues: 0
  };
  isLoading = false;
  error: string | null = null;
  private subscriptions: Subscription[] = [];

  // Recent activities
  recentActivities: any[] = [];

  constructor(
    private adminApi: AdminApiService,
    private supportService: AdminSupportService,
    private socketService: AdminSocketService,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    // This component is only loaded for the 'dashboard' route
    // Load dashboard data on initialization
    this.loadDashboard();
    this.loadSupportStats();
    this.setupSocketListeners();
  }

  ionViewWillEnter() {
    this.loadDashboard();
    this.loadSupportStats();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadSupportStats() {
    const sub = this.supportService.getSupportStats().subscribe({
      next: (stats) => {
        this.supportStats = stats;
      },
      error: (error) => {
        console.error('Error loading support stats:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  setupSocketListeners() {
    // Listen for new support requests
    const newIssueSub = this.socketService.on('support:new_issue').subscribe((data: any) => {
      console.log('New support issue on dashboard:', data);
      // Increment waiting count immediately
      if (this.supportStats.waiting !== undefined) {
        this.supportStats.waiting++;
        this.supportStats.totalIssues++;
      }
      // Also reload stats to ensure accuracy
      this.loadSupportStats();
    });
    this.subscriptions.push(newIssueSub);

    // Listen for issue acceptance
    const acceptSub = this.socketService.on('support:accept').subscribe((data: any) => {
      console.log('Support issue accepted on dashboard:', data);
      // Decrement waiting, increment active
      if (this.supportStats.waiting > 0) {
        this.supportStats.waiting--;
      }
      if (this.supportStats.active !== undefined) {
        this.supportStats.active++;
      }
      this.loadSupportStats();
    });
    this.subscriptions.push(acceptSub);

    // Listen for chat ended/resolved
    const endedSub = this.socketService.on('support:ended').subscribe((data: any) => {
      console.log('Support issue ended on dashboard:', data);
      // Decrement active, increment resolved
      if (this.supportStats.active > 0) {
        this.supportStats.active--;
      }
      if (this.supportStats.resolved !== undefined) {
        this.supportStats.resolved++;
      }
      this.loadSupportStats();
    });
    this.subscriptions.push(endedSub);

    // Listen for stats updates
    const statsUpdateSub = this.socketService.on('support:stats_updated').subscribe((data: any) => {
      console.log('Support stats updated on dashboard:', data);
      if (data.stats) {
        this.supportStats = { ...this.supportStats, ...data.stats };
      } else {
        this.loadSupportStats();
      }
    });
    this.subscriptions.push(statsUpdateSub);
  }

  navigateToSupport() {
    this.router.navigate(['/folder/support']);
  }

  navigateToEmergencies() {
    this.router.navigate(['/folder/emergencies']);
  }

  get isDashboard(): boolean {
    return true; // This component is only used for dashboard
  }

  get shouldShowContent(): boolean {
    return true; // Always show content since this is the dashboard page
  }

  formatActivityTime(time: string | Date): string {
    if (!time) return '';
    const date = typeof time === 'string' ? new Date(time) : time;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  loadDashboard() {
    this.isLoading = true;
    this.error = null;
    this.adminApi.getDashboard().subscribe({
      next: (data) => {
        const s = data?.stats || {};
        this.dashboardStats = {
          totalUsers: s.totalUsers || 0,
          activeDrivers: s.activeDrivers || 0,
          driversOnline: s.driversOnline ?? s.onlineDrivers ?? 0,
          driversOffline: s.driversOffline || 0,
          totalRides: s.totalRides || 0,
          pendingVehicles: s.pendingVehicles || 0,
          pendingDrivers: s.pendingDrivers || 0,
          pendingVendors: s.pendingVendors || 0,
          completedRides: s.completedRides || 0,
          cancelledRides: s.cancelledRides || 0,
          activeEmergencies: s.activeEmergencies ?? 0,
        };
        this.recentActivities = (data?.recentActivities || []).map((activity: any) => ({
          ...activity,
          icon: this.getActivityIcon(activity.type),
          time: this.formatActivityTime(activity.time)
        }));
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        this.error = error?.error?.message || 'Failed to load dashboard data';
        this.dashboardStats = {
          totalUsers: 0,
          activeDrivers: 0,
          driversOnline: 0,
          driversOffline: 0,
          totalRides: 0,
          pendingVehicles: 0,
          pendingDrivers: 0,
          pendingVendors: 0,
          completedRides: 0,
          cancelledRides: 0,
          activeEmergencies: 0,
        };
        this.recentActivities = [];
        
        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error || 'An error occurred',
          buttons: [
            {
              text: 'Retry',
              handler: () => this.loadDashboard()
            },
            {
              text: 'OK',
              role: 'cancel'
            }
          ]
        });
        await alert.present();
      }
    });
  }

  private getActivityIcon(type: string): string {
    switch (type) {
      case 'ride':
        return 'location-outline';
      case 'user':
        return 'person-outline';
      case 'driver':
        return 'car-outline';
      default:
        return 'notifications-outline';
    }
  }
}
