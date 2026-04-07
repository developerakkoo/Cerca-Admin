import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AdminApiService } from '../../../services/admin-api.service';
import { AdminSocketService } from '../../../services/admin-socket.service';
import {
  getPageNumbers as buildPageNumbers,
  getDisplayRange as formatAdminListRange,
  ADMIN_LIST_LIMIT_OPTIONS,
} from '../../../shared/utils/admin-pagination';

@Component({
  selector: 'app-rides',
  templateUrl: './rides.page.html',
  styleUrls: ['./rides.page.scss'],
  standalone: false,
})
export class RidesPage implements OnInit, OnDestroy {
  rides: any[] = [];
  isLoading = false;
  error: string | null = null;

  statusFilter = '';
  paymentStatusFilter = '';
  startDate = '';
  endDate = '';
  sortBy = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;
  limitOptions = [...ADMIN_LIST_LIMIT_OPTIONS];

  private statusUpdateSub?: Subscription;

  constructor(
    private adminApi: AdminApiService,
    private socketService: AdminSocketService,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRides();
    this.statusUpdateSub = this.socketService.on('rideStatusUpdated').subscribe(() => {
      this.loadRides(this.currentPage);
    });
  }

  ngOnDestroy() {
    this.statusUpdateSub?.unsubscribe();
  }

  ionViewWillEnter() {
    this.loadRides(this.currentPage);
  }

  buildParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: this.currentPage,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.paymentStatusFilter) params['paymentStatus'] = this.paymentStatusFilter;
    if (this.startDate) params['startDate'] = this.startDate;
    if (this.endDate) params['endDate'] = this.endDate;
    return params;
  }

  loadRides(page: number = 1) {
    this.isLoading = true;
    this.error = null;
    this.currentPage = page;

    this.adminApi.getRides(this.buildParams()).subscribe({
      next: (data) => {
        this.rides = data?.rides || [];
        const pagination = data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          total: 0,
          limit: this.limit,
        };
        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;
        this.total = pagination.total;
        this.isLoading = false;
      },
      error: async (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load rides';
        this.rides = [];
        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error ?? 'An error occurred',
          buttons: [
            { text: 'Retry', handler: () => this.loadRides(this.currentPage) },
            { text: 'OK', role: 'cancel' },
          ],
        });
        await alert.present();
      },
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadRides(1);
  }

  onSortOrderSegmentChange() {
    this.currentPage = 1;
    this.loadRides(1);
  }

  onSort(column: string) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'desc';
    }
    this.currentPage = 1;
    this.loadRides(1);
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return 'swap-vertical-outline';
    return this.sortOrder === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  onLimitChange() {
    this.currentPage = 1;
    this.loadRides(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadRides(page);
    }
  }

  getPageNumbers(): number[] {
    return buildPageNumbers(this.currentPage, this.totalPages);
  }

  getDisplayRange(): string {
    return formatAdminListRange(this.currentPage, this.limit, this.total, 'rides');
  }

  previousPage() {
    if (this.currentPage > 1) this.loadRides(this.currentPage - 1);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.loadRides(this.currentPage + 1);
  }

  viewRide(ride: any) {
    if (!ride?._id) return;
    this.router.navigate(['/folder/rides/ride', ride._id]);
  }

  riderName(ride: any): string {
    const r = ride?.rider;
    if (!r) return '—';
    return r.fullName || r.name || r.phoneNumber || '—';
  }

  driverName(ride: any): string {
    const d = ride?.driver;
    if (!d) return '—';
    return d.name || d.phone || '—';
  }

  shortRideId(ride: any): string {
    const id = ride?._id;
    if (!id) return '—';
    const s = String(id);
    return s.length > 12 ? `${s.slice(0, 10)}…` : s;
  }
}
