import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

type TargetMode = 'userId' | 'driverId' | 'tokens';

interface FcmPreset {
  id: string;
  label: string;
  /** Notification title preset. */
  title: string;
  /** Notification body preset. */
  body: string;
  /** Stringified JSON the user can edit before sending. */
  dataJson: string;
}

interface AttemptLog {
  timestamp: string;
  request: {
    mode: TargetMode;
    target: string;
    title: string;
    body: string;
    dataOnly: boolean;
  };
  status: 'success' | 'partial' | 'error';
  httpStatus: number | null;
  summary: string;
  responseJson: string;
}

@Component({
  selector: 'app-test-fcm',
  templateUrl: './test-fcm.page.html',
  styleUrls: ['./test-fcm.page.scss'],
  standalone: false,
})
export class TestFcmPage {
  /** Form state */
  mode: TargetMode = 'userId';
  userId = '';
  driverId = '';
  tokensRaw = '';
  title = 'Cerca test notification';
  body = 'Hello from the admin test page';
  dataJson = '{\n  "appType": "ride_status"\n}';
  dataOnly = false;
  androidChannelId = '';

  /** UI state */
  sending = false;
  jsonError: string | null = null;
  logs: AttemptLog[] = [];

  readonly presets: FcmPreset[] = [
    {
      id: 'ride_status',
      label: 'Ride status',
      title: 'Ride update',
      body: 'Your ride status changed.',
      dataJson: JSON.stringify(
        {
          appType: 'ride_status',
          backendType: 'driver_arrived',
          route: '/tabs/tabs/tab1',
        },
        null,
        2,
      ),
    },
    {
      id: 'chat_message',
      label: 'Chat message',
      title: 'New message from driver',
      body: 'Hi, I am here at the pickup point.',
      dataJson: JSON.stringify(
        {
          appType: 'chat_message',
          backendType: 'ride_chat_message',
          rideId: 'REPLACE_WITH_REAL_RIDE_ID',
          route: '/driver-chat/REPLACE_WITH_REAL_RIDE_ID',
        },
        null,
        2,
      ),
    },
    {
      id: 'promo',
      label: 'Promo',
      title: '20% off your next ride',
      body: 'Tap to see this week\'s offers.',
      dataJson: JSON.stringify(
        {
          appType: 'promo',
          backendType: 'promo',
          route: '/tabs/tabs/tab2',
        },
        null,
        2,
      ),
    },
    {
      id: 'custom',
      label: 'Custom',
      title: 'Custom test',
      body: 'Edit any field below before sending.',
      dataJson: '{\n  "appType": "system"\n}',
    },
  ];

  constructor(
    private adminApi: AdminApiService,
    private toastCtrl: ToastController,
  ) {}

  applyPreset(preset: FcmPreset): void {
    this.title = preset.title;
    this.body = preset.body;
    this.dataJson = preset.dataJson;
    this.jsonError = null;
  }

  /** Validate the JSON editor on every change so Send is gated. */
  validateJson(): void {
    const trimmed = (this.dataJson || '').trim();
    if (!trimmed) {
      this.jsonError = null;
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        this.jsonError = 'data must be a JSON object';
        return;
      }
      this.jsonError = null;
    } catch (err: any) {
      this.jsonError = `Invalid JSON: ${err.message}`;
    }
  }

  canSend(): boolean {
    if (this.sending || this.jsonError) return false;
    if (!this.title.trim()) return false;
    if (this.body === undefined || this.body === null) return false;
    if (this.mode === 'userId' && !this.userId.trim()) return false;
    if (this.mode === 'driverId' && !this.driverId.trim()) return false;
    if (this.mode === 'tokens' && !this.parseTokens().length) return false;
    return true;
  }

  async send(): Promise<void> {
    this.validateJson();
    if (!this.canSend()) return;

    let parsedData: Record<string, any> = {};
    if ((this.dataJson || '').trim()) {
      try {
        parsedData = JSON.parse(this.dataJson);
      } catch {
        this.jsonError = 'Invalid JSON';
        return;
      }
    }

    const targetSummary =
      this.mode === 'userId'
        ? `user:${this.userId.trim()}`
        : this.mode === 'driverId'
          ? `driver:${this.driverId.trim()}`
          : `tokens:${this.parseTokens().length}`;

    const payload: any = {
      mode: this.mode,
      title: this.title.trim(),
      body: this.body,
      data: parsedData,
      dataOnly: this.dataOnly,
    };
    if (this.mode === 'userId') payload.userId = this.userId.trim();
    if (this.mode === 'driverId') payload.driverId = this.driverId.trim();
    if (this.mode === 'tokens') payload.tokens = this.parseTokens();
    if (this.androidChannelId.trim()) {
      payload.androidChannelId = this.androidChannelId.trim();
    }

    this.sending = true;
    this.adminApi.sendTestFcm(payload).subscribe({
      next: (res) => {
        this.recordLog({
          status: this.classifyStatus(res),
          httpStatus: 200,
          summary:
            `success=${res?.dispatch?.successCount ?? 0} ` +
            `failure=${res?.dispatch?.failureCount ?? 0}` +
            (res?.dispatch?.reason ? ` (${res.dispatch.reason})` : ''),
          response: res,
          target: targetSummary,
        });
        this.sending = false;
        this.toast(`Sent (${res?.dispatch?.successCount ?? 0} ok / ${res?.dispatch?.failureCount ?? 0} failed)`);
      },
      error: (err) => {
        const httpStatus = typeof err?.status === 'number' ? err.status : null;
        this.recordLog({
          status: 'error',
          httpStatus,
          summary:
            err?.error?.error ||
            err?.error?.message ||
            err?.message ||
            'Request failed',
          response: err?.error || { message: err?.message },
          target: targetSummary,
        });
        this.sending = false;
        this.toast('Send failed — check the log panel');
      },
    });
  }

  clearLogs(): void {
    this.logs = [];
  }

  private parseTokens(): string[] {
    return (this.tokensRaw || '')
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  private classifyStatus(res: any): AttemptLog['status'] {
    if (!res?.success) return 'error';
    const fail = res?.dispatch?.failureCount || 0;
    const ok = res?.dispatch?.successCount || 0;
    if (fail > 0 && ok > 0) return 'partial';
    if (fail > 0 && ok === 0) return 'error';
    return 'success';
  }

  private recordLog(input: {
    status: AttemptLog['status'];
    httpStatus: number | null;
    summary: string;
    response: any;
    target: string;
  }): void {
    this.logs = [
      {
        timestamp: new Date().toISOString(),
        request: {
          mode: this.mode,
          target: input.target,
          title: this.title,
          body: this.body,
          dataOnly: this.dataOnly,
        },
        status: input.status,
        httpStatus: input.httpStatus,
        summary: input.summary,
        responseJson: this.safeStringify(input.response),
      },
      ...this.logs,
    ].slice(0, 50);
  }

  private safeStringify(value: any): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      position: 'bottom',
    });
    toast.present();
  }
}
