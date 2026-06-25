import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-driver-distance',
  templateUrl: './driver-distance.page.html',
  styleUrls: ['./driver-distance.page.scss'],
  standalone: false,
})
export class DriverDistancePage implements OnInit {
  rows: any[] = [];
  summary: any = null;
  timezone = '';
  isLoading = false;
  error: string | null = null;

  driverId = '';
  driverFilterLabel = '';
  groupBy: 'day' | 'week' = 'day';
  startDate = '';
  endDate = '';
  expandedRowKey: string | null = null;

  constructor(
    private adminApi: AdminApiService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    const presetDriverId = qp.get('driverId');
    if (presetDriverId) {
      this.driverId = presetDriverId;
      this.driverFilterLabel = qp.get('driverName') || 'Selected driver';
      if (!qp.get('driverName')) {
        this.resolveDriverLabel(presetDriverId);
      }
    }
    this.loadReport();
  }

  ionViewWillEnter() {
    this.loadReport();
  }

  private resolveDriverLabel(driverId: string) {
    this.adminApi.getDriverDetails(driverId).subscribe({
      next: (res) => {
        const d = res?.driver;
        if (d?.name) {
          this.driverFilterLabel = d.phone ? `${d.name} · ${d.phone}` : d.name;
        }
      },
    });
  }

  loadReport() {
    this.isLoading = true;
    this.error = null;

    const params: Record<string, string | boolean> = {
      groupBy: this.groupBy,
      includeRides: true,
    };
    if (this.driverId) params['driverId'] = this.driverId;
    if (this.startDate) params['startDate'] = this.startDate;
    if (this.endDate) params['endDate'] = this.endDate;

    this.adminApi.getDriverDistanceReport(params).subscribe({
      next: (res) => {
        const data = res?.data || {};
        this.rows = data.items || [];
        this.summary = data.summary || null;
        this.timezone = data.timezone || '';
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load distance report';
        this.rows = [];
        this.summary = null;
      },
    });
  }

  onFilterChange() {
    this.expandedRowKey = null;
    this.loadReport();
  }

  resetFilters() {
    this.driverId = '';
    this.driverFilterLabel = '';
    this.groupBy = 'day';
    this.startDate = '';
    this.endDate = '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    this.onFilterChange();
  }

  clearDriverFilter(): void {
    this.driverId = '';
    this.driverFilterLabel = '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    this.onFilterChange();
  }

  async openDriverFilterPicker(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Filter by driver',
      message: 'Search by phone or email:',
      inputs: [{ name: 'query', type: 'text', placeholder: 'Phone or email' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Search',
          handler: (data) => {
            const q = String(data?.query ?? '').trim();
            if (!q) {
              this.toastController
                .create({ message: 'Enter phone or email', color: 'warning', duration: 2000 })
                .then((t) => t.present());
              return false;
            }
            void this.runDriverSearchForFilter(q);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async runDriverSearchForFilter(query: string): Promise<void> {
    const loader = await this.loadingController.create({ message: 'Searching…' });
    await loader.present();
    this.adminApi
      .getDrivers({ search: query, page: 1, limit: 25, includeVendor: true })
      .subscribe({
        next: async (res) => {
          await loader.dismiss().catch(() => undefined);
          const raw = res?.drivers || [];
          const qLower = query.toLowerCase();
          const digitQ = query.replace(/\D/g, '');
          let matches = raw;
          if (query.includes('@')) {
            matches = raw.filter(
              (d: { email?: string }) => String(d?.email || '').toLowerCase() === qLower
            );
          } else if (digitQ.length >= 4) {
            matches = raw.filter((d: { phone?: string }) =>
              String(d?.phone || '')
                .replace(/\D/g, '')
                .includes(digitQ)
            );
          }
          if (!matches.length) {
            this.toastController
              .create({ message: 'No drivers matched.', color: 'warning', duration: 2500 })
              .then((t) => t.present());
            return;
          }
          if (matches.length === 1) {
            this.applyDriverFilter(matches[0]);
            return;
          }
          const pick = await this.alertController.create({
            header: 'Select driver',
            message: 'Multiple matches:',
            buttons: [
              ...matches.slice(0, 10).map((d: { _id: string; name?: string; phone?: string }) => ({
                text: `${d.name || 'Driver'} · ${d.phone || '—'}`,
                handler: () => this.applyDriverFilter(d),
              })),
              { text: 'Cancel', role: 'cancel' },
            ],
          });
          await pick.present();
        },
        error: async () => {
          await loader.dismiss().catch(() => undefined);
          this.toastController
            .create({ message: 'Search failed', color: 'danger', duration: 2500 })
            .then((t) => t.present());
        },
      });
  }

  private applyDriverFilter(driver: { _id: string; name?: string; phone?: string }) {
    this.driverId = driver._id;
    this.driverFilterLabel = driver.phone
      ? `${driver.name || 'Driver'} · ${driver.phone}`
      : driver.name || 'Driver';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        driverId: this.driverId,
        driverName: this.driverFilterLabel,
      },
      replaceUrl: true,
    });
    this.onFilterChange();
  }

  expandedKey(row: { driverId?: string; period?: string }): string {
    return `${row.driverId || ''}|${row.period || ''}`;
  }

  toggleRow(row: { driverId?: string; period?: string }) {
    const key = this.expandedKey(row);
    this.expandedRowKey = this.expandedRowKey === key ? null : key;
  }

  exportCsv() {
    const headers = ['Driver', 'Driver Phone', 'Period', 'Rides', 'Total km', 'Avg km'];
    const csvRows = this.rows.map((row) => [
      row.driverName || '',
      row.driverPhone || '',
      row.period || '',
      row.rideCount || 0,
      row.totalKm || 0,
      row.avgKmPerRide || 0,
    ]);
    const csv = [headers, ...csvRows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'driver-distance-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
