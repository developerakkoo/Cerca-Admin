import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AdminRegistrationAlertPayload,
} from './admin-socket.service';

export type DashboardNotificationVariant = 'primary' | 'warning' | 'danger';

export interface DashboardNotificationItem {
  id: string;
  title: string;
  message: string;
  path: string;
  variant: DashboardNotificationVariant;
}

const AUTO_DISMISS_MS = 2000;

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardNotificationService {
  private readonly itemsSubject = new BehaviorSubject<DashboardNotificationItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();

  private readonly dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getSnapshot(): DashboardNotificationItem[] {
    return this.itemsSubject.value;
  }

  /** @returns true if a new item was added (caller may increment unread badge). */
  enqueue(payload: AdminRegistrationAlertPayload): boolean {
    const notifId = payload.notificationId;
    if (
      notifId &&
      this.itemsSubject.value.some((i) => i.id === notifId)
    ) {
      return false;
    }

    const title =
      payload.title || 'New registration / pending approval';
    const message =
      payload.message ||
      'A new driver, vendor, or vehicle needs your attention.';
    const rawPath =
      payload.path ||
      (payload.data?.['path'] as string) ||
      '/folder/dashboard';
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

    const isVendorPayout =
      payload.kind === 'vendor_payout' ||
      payload.type === 'admin_vendor_payout_requested';
    const variant: DashboardNotificationVariant = isVendorPayout
      ? 'warning'
      : 'primary';

    const id = notifId ?? this.newLocalId();

    const item: DashboardNotificationItem = {
      id,
      title,
      message,
      path,
      variant,
    };

    const next = [item, ...this.itemsSubject.value];
    this.itemsSubject.next(next);

    const timer = setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
    this.dismissTimers.set(id, timer);
    return true;
  }

  /** Clear all items and timers (e.g. on logout). */
  clear(): void {
    this.dismissTimers.forEach((t) => clearTimeout(t));
    this.dismissTimers.clear();
    this.itemsSubject.next([]);
  }

  dismiss(id: string): void {
    const t = this.dismissTimers.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      this.dismissTimers.delete(id);
    }
    const cur = this.itemsSubject.value;
    const filtered = cur.filter((i) => i.id !== id);
    if (filtered.length !== cur.length) {
      this.itemsSubject.next(filtered);
    }
  }

  private newLocalId(): string {
    return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
