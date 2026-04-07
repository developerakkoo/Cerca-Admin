import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../../services/admin-api.service';
import {
  getPageNumbers as buildPageNumbers,
  getDisplayRange as formatAdminListRange,
  ADMIN_LIST_LIMIT_OPTIONS,
} from '../../../shared/utils/admin-pagination';
import {
  getVendorVerificationBadgeColor,
  getVendorVerificationShortLabel,
  isVendorPendingReview,
  isVendorRejected,
} from '../../../core/admin-vendor-status';

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.page.html',
  styleUrls: ['./vendors.page.scss'],
  standalone: false,
})
export class VendorsPage implements OnInit, OnDestroy {
  vendors: any[] = [];
  isLoading = false;
  error: string | null = null;
  searchTerm = '';
  filterVerified: 'all' | 'verified' | 'pending' | 'rejected' = 'all';
  /** Client-side filter on active/blocked */
  filterStatus: 'all' | 'active' | 'blocked' = 'all';

  currentPage = 1;
  limit = 20;
  limitOptions = [...ADMIN_LIST_LIMIT_OPTIONS];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
      });
    this.loadVendors();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    this.loadVendors();
  }

  loadVendors() {
    this.isLoading = true;
    this.error = null;
    this.adminApi.getVendors().subscribe({
      next: (data) => {
        this.vendors = data?.vendors || [];
        this.isLoading = false;
        this.clampCurrentPage();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load vendors';
        this.vendors = [];
      },
    });
  }

  /** All vendors matching search + segments (no paging). */
  get filteredVendors(): any[] {
    let list = [...this.vendors];

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          String(v.businessName || '')
            .toLowerCase()
            .includes(q) ||
          String(v.ownerName || '')
            .toLowerCase()
            .includes(q) ||
          String(v.email || '')
            .toLowerCase()
            .includes(q) ||
          String(v.phone || '')
            .toLowerCase()
            .includes(q)
      );
    }

    if (this.filterVerified === 'verified') {
      list = list.filter((v) => v.isVerified);
    } else if (this.filterVerified === 'pending') {
      list = list.filter((v) => isVendorPendingReview(v));
    } else if (this.filterVerified === 'rejected') {
      list = list.filter((v) => isVendorRejected(v));
    }

    if (this.filterStatus === 'active') {
      list = list.filter((v) => v.isActive);
    } else if (this.filterStatus === 'blocked') {
      list = list.filter((v) => !v.isActive);
    }

    return list;
  }

  get totalFiltered(): number {
    return this.filteredVendors.length;
  }

  get totalPages(): number {
    const t = this.totalFiltered;
    if (t === 0) return 1;
    return Math.ceil(t / this.limit);
  }

  /** Current page slice for the table. */
  get pagedVendors(): any[] {
    const start = (this.currentPage - 1) * this.limit;
    return this.filteredVendors.slice(start, start + this.limit);
  }

  onSearchInput() {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.clampCurrentPage();
  }

  onLimitChange() {
    this.currentPage = 1;
    this.clampCurrentPage();
  }

  private clampCurrentPage() {
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  getPageNumbers(): number[] {
    return buildPageNumbers(this.currentPage, this.totalPages);
  }

  getDisplayRange(): string {
    return formatAdminListRange(this.currentPage, this.limit, this.totalFiltered, 'vendors');
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  vendorVerificationShortLabel = getVendorVerificationShortLabel;
  vendorVerificationBadgeColor = getVendorVerificationBadgeColor;

  viewVendor(vendor: any) {
    this.router.navigate(['/folder/vendors/vendor', vendor._id]);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2000, color });
    await toast.present();
  }
}
