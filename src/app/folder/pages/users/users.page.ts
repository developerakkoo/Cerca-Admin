import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController, ViewWillEnter } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  getPageNumbers as buildPageNumbers,
  getDisplayRange as formatAdminListRange,
  ADMIN_LIST_LIMIT_OPTIONS,
} from '../../../shared/utils/admin-pagination';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: false,
})
export class UsersPage implements OnInit, OnDestroy, ViewWillEnter {
  users: any[] = [];
  isLoading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();
  statusFilter: 'all' | 'active' | 'blocked' = 'all';
  verifiedFilter: 'all' | 'verified' | 'unverified' = 'all';
  error: string | null = null;
  
  // Sorting
  sortBy: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;
  limitOptions = [...ADMIN_LIST_LIMIT_OPTIONS];
  
  // Edit modal
  editingUser: any = null;
  editFormData: any = {};
  profilePicPreview: string | null = null;
  selectedFile: File | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadUsers(1);
    });
    
    this.loadUsers();
  }

  ionViewWillEnter() {
    this.loadUsers(this.currentPage);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(page: number = 1) {
    this.isLoading = true;
    this.error = null;
    this.currentPage = page;
    
    const params: any = {
      page: this.currentPage,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
    
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.statusFilter === 'active') params.isActive = true;
    if (this.statusFilter === 'blocked') params.isActive = false;
    if (this.verifiedFilter === 'verified') params.isVerified = true;
    if (this.verifiedFilter === 'unverified') params.isVerified = false;

    this.adminApi.getUsers(params).subscribe({
      next: (data) => {
        this.users = data?.users || [];
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
        this.error = error?.error?.message || 'Failed to load users';
        this.users = [];
        
        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error || 'An error occurred',
          buttons: [
            {
              text: 'Retry',
              handler: () => this.loadUsers(this.currentPage)
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

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadUsers(1);
  }

  onVerifiedFilterChange() {
    this.currentPage = 1;
    this.loadUsers(1);
  }

  onSort(column: string) {
    if (this.sortBy === column) {
      // Toggle sort order if same column
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to descending
      this.sortBy = column;
      this.sortOrder = 'desc';
    }
    this.loadUsers(this.currentPage);
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return 'swap-vertical-outline';
    return this.sortOrder === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  onLimitChange() {
    this.currentPage = 1;
    this.loadUsers(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadUsers(page);
    }
  }

  getPageNumbers(): number[] {
    return buildPageNumbers(this.currentPage, this.totalPages);
  }

  getDisplayRange(): string {
    return formatAdminListRange(this.currentPage, this.limit, this.total, 'users');
  }

  async toggleBlock(user: any) {
    const newStatus = !user.isActive;
    const action = newStatus ? 'unblock' : 'block';
    
    const alert = await this.alertController.create({
      header: `${action === 'block' ? 'Block' : 'Unblock'} User`,
      message: `Are you sure you want to ${action} ${user.fullName}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => {
            this.adminApi.updateUserStatus(user._id, newStatus).subscribe({
              next: async () => {
                user.isActive = newStatus;
                const toast = await this.toastController.create({
                  message: `User ${action}ed successfully`,
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: error?.error?.message || `Failed to ${action} user`,
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

  async toggleVerify(user: any) {
    const newStatus = !user.isVerified;
    const action = newStatus ? 'verify' : 'unverify';
    
    this.adminApi.verifyUser(user._id, newStatus).subscribe({
      next: async () => {
        user.isVerified = newStatus;
        const toast = await this.toastController.create({
          message: `User ${action}d successfully`,
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      },
      error: async (error) => {
        const toast = await this.toastController.create({
          message: error?.error?.message || `Failed to ${action} user`,
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async adjustWallet(user: any) {
    const alert = await this.alertController.create({
      header: 'Adjust Wallet',
      inputs: [
        { 
          name: 'amount', 
          type: 'number', 
          placeholder: 'Amount',
          min: 0
        },
        { 
          name: 'type', 
          type: 'text', 
          placeholder: 'add or deduct',
          value: 'add'
        },
        { 
          name: 'description', 
          type: 'text', 
          placeholder: 'Description (optional)' 
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Apply',
          handler: async (data) => {
            if (!data.amount || data.amount <= 0) {
              const toast = await this.toastController.create({
                message: 'Please enter a valid amount',
                duration: 2000,
                color: 'warning'
              });
              await toast.present();
              return false;
            }
            
            const amount = Number(data.amount);
            const type = data.type === 'deduct' ? 'deduct' : 'add';
            
            this.adminApi.adjustUserWallet(user._id, amount, type, data.description).subscribe({
              next: async () => {
                const toast = await this.toastController.create({
                  message: `Wallet ${type === 'add' ? 'credited' : 'debited'} successfully`,
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                this.loadUsers(this.currentPage); // Reload to get updated wallet balance
              },
              error: async (error) => {
                const toast = await this.toastController.create({
                  message: error?.error?.message || 'Failed to adjust wallet',
                  duration: 2000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.loadUsers(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadUsers(this.currentPage + 1);
    }
  }

  async editUser(user: any) {
    this.editingUser = user;
    this.editFormData = {
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
    };
    this.profilePicPreview = user.profilePic || null;
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('File size must be less than 5MB', 'warning');
        return;
      }
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        this.showToast('Only JPEG, JPG, and PNG images are allowed', 'warning');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePicPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveUser() {
    if (!this.editFormData.fullName || !this.editFormData.email) {
      this.showToast('Full name and email are required', 'warning');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editFormData.email)) {
      this.showToast('Please enter a valid email address', 'warning');
      return;
    }

    this.isLoading = true;
    this.adminApi.updateUser(this.editingUser._id, this.editFormData, this.selectedFile || undefined).subscribe({
      next: async () => {
        this.isLoading = false;
        this.showToast('User updated successfully', 'success');
        this.cancelEdit();
        this.loadUsers(this.currentPage);
      },
      error: async (error) => {
        this.isLoading = false;
        this.showToast(error?.error?.message || 'Failed to update user', 'danger');
      }
    });
  }

  cancelEdit() {
    this.editingUser = null;
    this.editFormData = {};
    this.profilePicPreview = null;
    this.selectedFile = null;
  }

  async deleteUser(user: any) {
    const alert = await this.alertController.create({
      header: 'Delete User',
      message: `Are you sure you want to delete ${user.fullName}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.isLoading = true;
            this.adminApi.deleteUser(user._id).subscribe({
              next: async () => {
                this.isLoading = false;
                this.showToast('User deleted successfully', 'success');
                this.loadUsers(this.currentPage);
              },
              error: async (error) => {
                this.isLoading = false;
                this.showToast(error?.error?.message || 'Failed to delete user', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
