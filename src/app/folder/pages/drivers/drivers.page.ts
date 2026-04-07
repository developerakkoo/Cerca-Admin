import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';
import {
  approvalBadgeColor,
  approvalStatusLabel,
  canAdminFinalApproveOrReject,
  formatApiErrorWithMissingDocs,
} from '../../../core/driver-approval';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  getPageNumbers as buildPageNumbers,
  getDisplayRange as formatAdminListRange,
  ADMIN_LIST_LIMIT_OPTIONS,
} from '../../../shared/utils/admin-pagination';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.page.html',
  styleUrls: ['./drivers.page.scss'],
  standalone: false,
})
export class DriversPage implements OnInit, OnDestroy {
  drivers: any[] = [];
  isLoading = false;
  searchTerm = '';
  /** All | verified drivers | pending (unverified) — dropdown beside search */
  verifiedFilter: 'all' | 'verified' | 'pending' = 'all';
  statusFilter:
    | 'all'
    | 'active'
    | 'new'
    | 'priorityPending'
    | 'vehiclePending'
    | 'pendingAdmin' = 'all';
  error: string | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Pagination
  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;
  limitOptions = [...ADMIN_LIST_LIMIT_OPTIONS];

  approvalLabel = approvalStatusLabel;
  approvalColor = approvalBadgeColor;
  canAdminFinalApproveOrReject = canAdminFinalApproveOrReject;

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
        this.loadDrivers(1);
      });
    this.loadDrivers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    this.loadDrivers(this.currentPage);
  }

  loadDrivers(page: number = 1) {
    this.isLoading = true;
    this.error = null;
    this.currentPage = page;
    
    const params: {
      page: number;
      limit: number;
      includeVendor: boolean;
      search?: string;
      isActive?: boolean;
      isVerified?: boolean;
      priorityPending?: boolean;
      vehiclePending?: boolean;
      approvalStatus?: string;
    } = {
      page: this.currentPage,
      limit: this.limit,
      includeVendor: true,
    };

    if (this.searchTerm) params.search = this.searchTerm;
    if (this.statusFilter === 'active') params.isActive = true;
    if (this.statusFilter === 'new') {
      params.isVerified = false;
    } else if (this.verifiedFilter === 'verified') {
      params.isVerified = true;
    } else if (this.verifiedFilter === 'pending') {
      params.isVerified = false;
    }
    if (this.statusFilter === 'priorityPending') params.priorityPending = true;
    if (this.statusFilter === 'vehiclePending') params.vehiclePending = true;
    if (this.statusFilter === 'pendingAdmin') {
      params.approvalStatus = 'PENDING_ADMIN';
    }

    this.adminApi.getDrivers(params).subscribe({
      next: (data) => {
        this.drivers = data?.drivers || [];
        const pagination = data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          total: 0,
          limit: this.limit
        };
        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;
        this.total = pagination.total;
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        this.error = error?.error?.message || 'Failed to load drivers';
        this.drivers = [];
        
        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error || 'An error occurred',
          buttons: [
            {
              text: 'Retry',
              handler: () => this.loadDrivers(this.currentPage)
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

  onSearchInput() {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadDrivers(1);
  }

  async approveDriver(driver: any) {
    const alert = await this.alertController.create({
      header: 'Approve Driver',
      message: `Are you sure you want to approve ${driver.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.adminApi.approveDriver(driver._id).subscribe({
              next: async () => {
                driver.isActive = true;
                const toast = await this.toastController.create({
                  message: 'Driver approved successfully',
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                this.loadDrivers(this.currentPage);
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: formatApiErrorWithMissingDocs(error),
                  duration: 4000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async rejectDriver(driver: any, event?: Event) {
    if (event) event.stopPropagation();
    const alert = await this.alertController.create({
      header: 'Reject Driver',
      message: `Rejection reason is required. It will be shown to the driver.`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Enter rejection reason (required)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: (data) => {
            const reason = data?.reason?.trim();
            if (!reason) {
              return; // Keep alert open - reason required
            }
            this.adminApi.rejectDriver(driver._id, reason).subscribe({
              next: async () => {
                driver.isActive = false;
                const toast = await this.toastController.create({
                  message: 'Driver rejected successfully',
                  duration: 2000,
                  color: 'warning'
                });
                await toast.present();
                this.loadDrivers(this.currentPage);
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: formatApiErrorWithMissingDocs(error),
                  duration: 4000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleVerify(driver: any) {
    const newStatus = !driver.isVerified;
    const action = newStatus ? 'verify (final approval)' : 'reset to pending approval';
    const detail = newStatus
      ? 'Turning verification on runs final approval checks (including required compliance documents).'
      : 'Turning verification off resets the driver to pending vendor review if they are vendor-linked, otherwise pending admin.';

    const alert = await this.alertController.create({
      header: newStatus ? 'Verify driver' : 'Unverify driver',
      message: `${detail} Continue?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Continue',
          handler: () => {
            this.adminApi.verifyDriver(driver._id, newStatus).subscribe({
              next: async () => {
                driver.isVerified = newStatus;
                const toast = await this.toastController.create({
                  message: `Driver ${action} completed`,
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                this.loadDrivers(this.currentPage);
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: formatApiErrorWithMissingDocs(error),
                  duration: 4000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleBlock(driver: any) {
    const newStatus = !driver.isActive;
    const action = newStatus ? 'unblock' : 'block';
    
    const alert = await this.alertController.create({
      header: `${action === 'block' ? 'Block' : 'Unblock'} Driver`,
      message: `Are you sure you want to ${action} ${driver.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => {
            this.adminApi.updateDriverStatus(driver._id, newStatus).subscribe({
              next: async () => {
                driver.isActive = newStatus;
                const toast = await this.toastController.create({
                  message: `Driver ${action}ed successfully`,
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                this.loadDrivers(this.currentPage);
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: error?.error?.message || `Failed to ${action} driver`,
                  duration: 2000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async viewDocuments(driver: any) {
    this.isLoading = true;
    this.adminApi.getDriverDocuments(driver._id).subscribe({
      next: async (data) => {
        this.isLoading = false;
        const documents = data?.documents || [];
        if (documents.length === 0) {
          const alert = await this.alertController.create({
            header: 'Driver Documents',
            message: 'No documents available',
            buttons: ['OK']
          });
          await alert.present();
          return;
        }
        
        const message = documents.map((doc: any) => 
          `${doc.type || 'Document'}: ${doc.url || doc.path || 'N/A'}`
        ).join('<br/><br/>');
        
        const alert = await this.alertController.create({
          header: 'Driver Documents',
          message: message,
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (error) => {
        this.isLoading = false;
        const alert = await this.alertController.create({
          header: 'Error',
          message: error?.error?.message || 'Failed to load documents',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  viewDriver(driver: any) {
    if (!driver?._id) return;
    this.router.navigate(['/folder/drivers/driver', driver._id]);
  }

  viewEarnings(driver: any, event?: Event) {
    if (event) event.stopPropagation();
    if (!driver?._id) return;
    this.router.navigate(['/folder/driver-earnings', driver._id]);
  }

  onLimitChange() {
    this.currentPage = 1;
    this.loadDrivers(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadDrivers(page);
    }
  }

  getPageNumbers(): number[] {
    return buildPageNumbers(this.currentPage, this.totalPages);
  }

  getDisplayRange(): string {
    return formatAdminListRange(this.currentPage, this.limit, this.total, 'drivers');
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.loadDrivers(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadDrivers(this.currentPage + 1);
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
