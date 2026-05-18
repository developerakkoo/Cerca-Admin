import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApiService } from '../../../services/admin-api.service';
import { AdminNotificationBadgeService } from '../../../services/admin-notification-badge.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false,
})
export class NotificationsPage implements OnInit {
  notifications: any[] = [];
  isLoading = false;
  error: string | null = null;
  private skip = 0;
  private readonly pageSize = 30;
  hasMore = true;

  constructor(
    private adminApi: AdminApiService,
    private router: Router,
    private badge: AdminNotificationBadgeService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(event?: { target: { complete: () => void } } | null): void {
    this.error = null;
    this.skip = 0;
    this.hasMore = true;
    this.isLoading = !event;
    this.adminApi
      .getAdminNotifications({ limit: this.pageSize, skip: 0 })
      .subscribe({
        next: (res) => {
          if (res?.success) {
            this.notifications = res.notifications || [];
            this.hasMore = (res.notifications?.length || 0) >= this.pageSize;
            this.skip = this.notifications.length;
            this.badge.refresh();
          } else {
            this.error = 'Could not load notifications';
          }
          this.isLoading = false;
          event?.target?.complete();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load notifications';
          this.isLoading = false;
          event?.target?.complete();
        },
      });
  }

  loadMore(event: { target: { complete: () => void; disabled: boolean } }): void {
    if (!this.hasMore) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }
    this.adminApi
      .getAdminNotifications({ limit: this.pageSize, skip: this.skip })
      .subscribe({
        next: (res) => {
          if (res?.success && res.notifications?.length) {
            this.notifications = [...this.notifications, ...res.notifications];
            this.skip = this.notifications.length;
            this.hasMore = (res.notifications.length || 0) >= this.pageSize;
          } else {
            this.hasMore = false;
          }
          event.target.complete();
          if (!this.hasMore) {
            event.target.disabled = true;
          }
        },
        error: () => {
          event.target.complete();
        },
      });
  }

  markAllRead(): void {
    this.adminApi.markAllAdminNotificationsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        this.badge.refresh();
      },
    });
  }

  openNotification(n: any): void {
    const path =
      (n.data && typeof n.data.path === 'string' && n.data.path) || '/folder/dashboard';
    if (!n.isRead && n._id) {
      this.adminApi.markAdminNotificationRead(n._id).subscribe({
        next: () => {
          n.isRead = true;
          this.badge.refresh();
          this.navigateByPath(path);
        },
        error: () => this.navigateByPath(path),
      });
    } else {
      this.navigateByPath(path);
    }
  }

  private navigateByPath(path: string): void {
    const url = path.startsWith('/') ? path : `/${path}`;
    this.router.navigateByUrl(url);
  }
}
