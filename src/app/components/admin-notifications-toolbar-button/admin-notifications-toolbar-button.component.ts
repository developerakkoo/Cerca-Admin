import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonBadge, IonButton, IonIcon } from '@ionic/angular/standalone';
import { AdminNotificationBadgeService } from '../../services/admin-notification-badge.service';

@Component({
  selector: 'app-admin-notifications-toolbar-button',
  standalone: true,
  imports: [RouterLink, IonButton, IonIcon, IonBadge],
  templateUrl: './admin-notifications-toolbar-button.component.html',
  styleUrls: ['./admin-notifications-toolbar-button.component.scss'],
})
export class AdminNotificationsToolbarButtonComponent {
  private readonly badgeService = inject(AdminNotificationBadgeService);
  private readonly destroyRef = inject(DestroyRef);

  unreadCount = 0;

  constructor() {
    this.badgeService.unreadCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n) => (this.unreadCount = n));
  }

  get badgeLabel(): string {
    if (this.unreadCount <= 0) return '';
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
  }

  get ariaLabel(): string {
    if (this.unreadCount <= 0) {
      return 'Notifications';
    }
    return `Notifications, ${this.unreadCount} unread`;
  }
}
