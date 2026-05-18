import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdminApiService } from './admin-api.service';

/**
 * Shared unread count for admin in-app notifications (menu badge + socket updates).
 */
@Injectable({ providedIn: 'root' })
export class AdminNotificationBadgeService {
  private countSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.countSubject.asObservable();

  constructor(private adminApi: AdminApiService) {}

  getSnapshot(): number {
    return this.countSubject.value;
  }

  refresh(): void {
    this.adminApi.getAdminNotifications({ limit: 1 }).subscribe({
      next: (res) => {
        if (res?.success && typeof res.unreadCount === 'number') {
          this.countSubject.next(res.unreadCount);
        }
      },
      error: () => this.countSubject.next(0),
    });
  }

  increment(by = 1): void {
    this.countSubject.next(Math.max(0, this.getSnapshot() + by));
  }
}
