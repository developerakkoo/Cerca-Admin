import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MenuController, AlertController } from '@ionic/angular';
import { filter, Subscription } from 'rxjs';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminSupportService } from './services/admin-support.service';
import { AdminSocketService } from './services/admin-socket.service';
import { AdminApiService } from './services/admin-api.service';
import { AdminNotificationBadgeService } from './services/admin-notification-badge.service';
import {
  AdminDashboardNotificationService,
  DashboardNotificationItem,
} from './services/admin-dashboard-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  public appPages = [
    { title: 'Dashboard', url: '/folder/dashboard', icon: 'grid' },
    { title: 'Analytics', url: '/folder/analytics', icon: 'analytics' },
    { title: 'Users', url: '/folder/users', icon: 'people' },
    { title: 'Drivers', url: '/folder/drivers', icon: 'car' },
    { title: 'Vehicles', url: '/folder/vehicles', icon: 'bus' },
    { title: 'Vendors', url: '/folder/vendors', icon: 'business' },
    { title: 'Rides', url: '/folder/rides', icon: 'car-sport' },
    { title: 'Driver Earnings', url: '/folder/driver-earnings', icon: 'cash' },
    { title: 'Payouts', url: '/folder/payouts', icon: 'wallet' },
    { title: 'Promo Codes', url: '/folder/promo-codes', icon: 'gift' },
    { title: 'Support Chat', url: '/folder/support', icon: 'chatbubbles' },
    { title: 'Payment Disputes', url: '/folder/payment-disputes', icon: 'card' },
    { title: 'Emergencies', url: '/folder/emergencies', icon: 'warning' },
    { title: 'FCM Test', url: '/folder/test/fcm', icon: 'notifications' },
    { title: 'Settings', url: '/folder/settings', icon: 'settings' },
  ];
  
  waitingIssuesCount: number = 0;
  /** Pending vehicle approvals (fleet + personal) for menu badge */
  pendingVehiclesCount: number = 0;
  private routerSubscription?: Subscription;
  private supportStatsSubscription?: Subscription;
  private dashboardNotifSubscription?: Subscription;
  private socketSubscriptions: Subscription[] = [];

  /** Newest-first queue for dashboard socket notifications (see template stack). */
  dashboardStackItems: DashboardNotificationItem[] = [];

  constructor(
    private router: Router,
    private menuController: MenuController,
    private authService: AdminAuthService,
    private supportService: AdminSupportService,
    private socketService: AdminSocketService,
    private adminApi: AdminApiService,
    private adminNotificationBadge: AdminNotificationBadgeService,
    private dashboardNotifications: AdminDashboardNotificationService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Listen to route changes and enable/disable menu accordingly
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        if (url.includes('/login')) {
          this.menuController.enable(false);
        } else {
          this.menuController.enable(true);
          if (url.includes('/folder/vehicles')) {
            this.loadPendingVehiclesCount();
          }
          if (url.includes('/folder/notifications')) {
            this.adminNotificationBadge.refresh();
          }
        }
      });

    // Check initial route
    const currentUrl = this.router.url;
    if (currentUrl.includes('/login')) {
      this.menuController.enable(false);
    } else {
      this.menuController.enable(true);
      this.initializeSupport();
      this.loadPendingVehiclesCount();
    }
  }

  loadPendingVehiclesCount() {
    if (!this.authService.isAuthenticated()) return;
    this.adminApi.getVehicleInventory({ status: 'UNDER_APPROVAL' }).subscribe({
      next: (res) => {
        if (res?.success && typeof res.totalVehicles === 'number') {
          this.pendingVehiclesCount = res.totalVehicles;
        }
      },
      error: () => {
        this.pendingVehiclesCount = 0;
      },
    });
  }

  initializeSupport() {
    // Load support stats
    this.loadSupportStats();
    this.adminNotificationBadge.refresh();

    this.dashboardNotifSubscription?.unsubscribe();
    this.dashboardNotifSubscription = this.dashboardNotifications.items$.subscribe(
      (items) => (this.dashboardStackItems = items)
    );

    // Initialize socket if admin is logged in
    if (this.authService.isAuthenticated()) {
      this.socketService.initialize();
      this.setupSocketListeners();
    }
  }

  setupSocketListeners() {
    // Listen for new support issues
    const newIssueSub = this.socketService.on('support:new_issue').subscribe((data: any) => {
      console.log('New support issue received:', data);
      this.waitingIssuesCount++;
      // Also reload stats to ensure accuracy
      this.loadSupportStats();
    });
    this.socketSubscriptions.push(newIssueSub);

    // Listen for issue acceptance (decrement waiting count)
    const acceptSub = this.socketService.on('support:accept').subscribe((data: any) => {
      console.log('Support issue accepted:', data);
      if (this.waitingIssuesCount > 0) {
        this.waitingIssuesCount--;
      }
      this.loadSupportStats();
    });
    this.socketSubscriptions.push(acceptSub);

    // Listen for stats updates
    const statsUpdateSub = this.socketService.on('support:stats_updated').subscribe((data: any) => {
      console.log('Support stats updated:', data);
      if (data.stats) {
        this.waitingIssuesCount = data.stats.waiting || 0;
      } else {
        this.loadSupportStats();
      }
    });
    this.socketSubscriptions.push(statsUpdateSub);

    // Listen for emergency alerts
    const emergencySub = this.socketService.onEmergencyAlert().subscribe(async (emergency: any) => {
      console.error('🚨 EMERGENCY ALERT RECEIVED:', emergency);
      
      // Show prominent alert
      const alert = await this.alertController.create({
        header: '🚨 EMERGENCY ALERT',
        subHeader: emergency.reason || 'Emergency',
        message: `Emergency triggered: ${emergency.reason || 'Unknown reason'}\n\nLocation: ${emergency.location ? `Lat: ${emergency.location.coordinates?.[1]}, Lng: ${emergency.location.coordinates?.[0]}` : 'Unknown'}\n\nPlease take immediate action!`,
        buttons: [
          {
            text: 'View Details',
            handler: () => {
              if (emergency._id) {
                this.router.navigate(['/folder/emergencies', emergency._id]);
              } else {
                this.router.navigate(['/folder/emergencies']);
              }
            }
          },
          {
            text: 'Dismiss',
            role: 'cancel'
          }
        ],
        cssClass: 'emergency-alert',
        backdropDismiss: false // Force admin to acknowledge
      });
      await alert.present();
    });
    this.socketSubscriptions.push(emergencySub);

    const registrationSub = this.socketService
      .onAdminRegistrationAlert()
      .subscribe((payload) => {
        if (this.dashboardNotifications.enqueue(payload)) {
          this.adminNotificationBadge.increment(1);
        }
      });
    this.socketSubscriptions.push(registrationSub);
  }

  get visibleStackItems(): DashboardNotificationItem[] {
    return this.dashboardStackItems.slice(0, 5);
  }

  get stackOverflowCount(): number {
    return Math.max(0, this.dashboardStackItems.length - 5);
  }

  /** Reserve vertical space for the front card when using absolute stack layout. */
  get stackInnerMinHeightPx(): number {
    const n = this.visibleStackItems.length;
    if (n === 0) {
      return 0;
    }
    const baseCard = 96;
    const step = 10;
    return baseCard + step * Math.max(0, n - 1);
  }

  /** Oldest-first for DOM order so the newest card paints on top. */
  reversedVisibleStack(): DashboardNotificationItem[] {
    return [...this.visibleStackItems].reverse();
  }

  stackCardDepth(idx: number): number {
    const n = this.visibleStackItems.length;
    return n > 0 ? n - 1 - idx : 0;
  }

  dismissDashboardNotification(id: string, ev?: Event): void {
    ev?.stopPropagation();
    this.dashboardNotifications.dismiss(id);
  }

  openDashboardNotificationPath(path: string): void {
    this.router.navigateByUrl(path);
  }

  viewAllDashboardNotifications(): void {
    this.router.navigate(['/folder/notifications']);
  }

  loadSupportStats() {
    if (this.supportStatsSubscription) {
      this.supportStatsSubscription.unsubscribe();
    }
    this.supportStatsSubscription = this.supportService.getSupportStats().subscribe({
      next: (stats) => {
        this.waitingIssuesCount = stats.waiting || 0;
      },
      error: (error) => {
        console.error('Error loading support stats:', error);
      }
    });
  }

  logout() {
    this.dashboardNotifications.clear();
    this.authService.logout();
    this.menuController.enable(false);
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.supportStatsSubscription) {
      this.supportStatsSubscription.unsubscribe();
    }
    this.socketSubscriptions.forEach(sub => sub.unsubscribe());
    this.dashboardNotifSubscription?.unsubscribe();
    this.socketService.disconnect();
  }
}
