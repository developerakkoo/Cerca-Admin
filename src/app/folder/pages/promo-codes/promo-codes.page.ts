import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../../services/admin-api.service';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-promo-codes',
  templateUrl: './promo-codes.page.html',
  styleUrls: ['./promo-codes.page.scss'],
  standalone: false,
})
export class PromoCodesPage implements OnInit {
  promoCodes: any[] = [];
  isLoading = false;
  isSaving = false;
  showForm = false;
  editingPromo: any = null;
  filterType: string = 'all';
  filterStatus: string = 'all';
  
  // User selection modal
  showUserSelection = false;
  selectedGift: any = null;
  users: any[] = [];
  selectedUserIds: string[] = [];
  isLoadingUsers = false;
  userSearchTerm = '';

  promoForm: any = {
    couponCode: '',
    type: 'fixed',
    description: '',
    discountValue: 0,
    maxDiscountAmount: null,
    minOrderAmount: 0,
    startDate: '',
    validUntil: '',
    maxUsage: null,
    maxUsagePerUser: 1,
    isActive: true,
    isGift: false,
    giftType: 'MANUAL',
    giftTitle: '',
    giftDescription: '',
    giftImage: 'assets/gift-box.png',
    priority: 0,
    autoAssignConditions: {
      minRideCount: null,
      birthdayCheck: false,
    },
    applicableServices: [],
    applicableRideTypes: ['normal'],
  };

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.loadPromoCodes();
  }

  loadPromoCodes() {
    this.isLoading = true;
    this.adminApi.getPromoCodes().subscribe({
      next: (response: any) => {
        // Handle different response formats
        if (response && Array.isArray(response)) {
          this.promoCodes = response;
        } else if (response && response.data) {
          // Check if data has coupons array
          if (response.data.coupons && Array.isArray(response.data.coupons)) {
            this.promoCodes = response.data.coupons;
          } else if (Array.isArray(response.data)) {
            this.promoCodes = response.data;
          } else {
            this.promoCodes = [];
          }
        } else {
          this.promoCodes = [];
        }
        console.log('Loaded promo codes:', this.promoCodes.length);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading promo codes:', error);
        this.showToast('Failed to load promo codes', 'danger');
        this.isLoading = false;
      },
    });
  }

  openCreateForm() {
    this.editingPromo = null;
    this.resetForm();
    this.showForm = true;
  }

  openEditForm(promo: any) {
    this.editingPromo = promo;
    this.promoForm = {
      couponCode: promo.couponCode || '',
      type: promo.type || 'fixed',
      description: promo.description || '',
      discountValue: promo.discountValue || 0,
      maxDiscountAmount: promo.maxDiscountAmount || null,
      minOrderAmount: promo.minOrderAmount || 0,
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
      validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : '',
      maxUsage: promo.maxUsage || null,
      maxUsagePerUser: promo.maxUsagePerUser || 1,
      isActive: promo.isActive !== false,
      isGift: promo.isGift || false,
      giftType: promo.giftType || 'MANUAL',
      giftTitle: promo.giftTitle || '',
      giftDescription: promo.giftDescription || '',
      giftImage: promo.giftImage || 'assets/gift-box.png',
      priority: promo.priority || 0,
      autoAssignConditions: promo.autoAssignConditions || {
        minRideCount: null,
        birthdayCheck: false,
      },
      applicableServices: promo.applicableServices || [],
      applicableRideTypes: promo.applicableRideTypes || ['normal'],
    };
    this.showForm = true;
  }

  resetForm() {
    this.promoForm = {
      couponCode: '',
      type: 'fixed',
      description: '',
      discountValue: 0,
      maxDiscountAmount: null,
      minOrderAmount: 0,
      startDate: '',
      validUntil: '',
      maxUsage: null,
      maxUsagePerUser: 1,
      isActive: true,
      isGift: false,
      giftType: 'MANUAL',
      giftTitle: '',
      giftDescription: '',
      giftImage: 'assets/gift-box.png',
      priority: 0,
      autoAssignConditions: {
        minRideCount: null,
        birthdayCheck: false,
      },
      applicableServices: [],
      applicableRideTypes: ['normal'],
    };
  }

  async savePromoCode() {
    // Validation
    if (!this.promoForm.description) {
      this.showToast('Description is required', 'danger');
      return;
    }
    if (this.promoForm.discountValue <= 0) {
      this.showToast('Discount value must be greater than 0', 'danger');
      return;
    }
    if (!this.promoForm.startDate || !this.promoForm.validUntil) {
      this.showToast('Start date and valid until date are required', 'danger');
      return;
    }
    if (new Date(this.promoForm.startDate) >= new Date(this.promoForm.validUntil)) {
      this.showToast('Valid until date must be after start date', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.editingPromo ? 'Updating promo code...' : 'Creating promo code...',
    });
    await loading.present();

    try {
      const payload = {
        ...this.promoForm,
        startDate: new Date(this.promoForm.startDate).toISOString(),
        validUntil: new Date(this.promoForm.validUntil).toISOString(),
      };

      // Remove couponCode if empty (will be auto-generated)
      if (!payload.couponCode || payload.couponCode.trim() === '') {
        delete payload.couponCode;
      } else {
        payload.couponCode = payload.couponCode.toUpperCase().trim();
      }

      let response: any;
      if (this.editingPromo) {
        response = await this.adminApi.updatePromoCode(this.editingPromo._id, payload).toPromise();
      } else {
        response = await this.adminApi.createPromoCode(payload).toPromise();
      }

      await loading.dismiss();
      this.showToast(
        this.editingPromo ? 'Promo code updated successfully' : 'Promo code created successfully',
        'success'
      );
      this.showForm = false;
      this.loadPromoCodes();
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error saving promo code:', error);
      this.showToast(
        error.error?.message || 'Failed to save promo code',
        'danger'
      );
    }
  }

  async deletePromoCode(promo: any) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete promo code "${promo.couponCode}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Deleting promo code...',
            });
            await loading.present();

            try {
              await this.adminApi.deletePromoCode(promo._id).toPromise();
              await loading.dismiss();
              this.showToast('Promo code deleted successfully', 'success');
              this.loadPromoCodes();
            } catch (error: any) {
              await loading.dismiss();
              console.error('Error deleting promo code:', error);
              this.showToast(
                error.error?.message || 'Failed to delete promo code',
                'danger'
              );
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async toggleStatus(promo: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Updating status...',
    });
    await loading.present();

    try {
      await this.adminApi.updatePromoCode(promo._id, {
        isActive: !promo.isActive,
      }).toPromise();
      await loading.dismiss();
      this.showToast(
        promo.isActive ? 'Promo code deactivated' : 'Promo code activated',
        'success'
      );
      this.loadPromoCodes();
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error toggling status:', error);
      this.showToast('Failed to update status', 'danger');
    }
  }

  getFilteredPromoCodes() {
    let filtered = [...this.promoCodes];

    if (this.filterType !== 'all') {
      filtered = filtered.filter((p) => {
        if (this.filterType === 'gift') {
          return p.isGift === true;
        }
        return p.type === this.filterType;
      });
    }

    if (this.filterStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter((p) => {
        if (this.filterStatus === 'active') {
          return p.isActive && new Date(p.validUntil) > now && new Date(p.startDate) <= now;
        }
        if (this.filterStatus === 'inactive') {
          return !p.isActive;
        }
        if (this.filterStatus === 'expired') {
          return new Date(p.validUntil) <= now;
        }
        return true;
      });
    }

    return filtered;
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }

  async openSendGiftModal(promo: any) {
    if (!promo.isGift) {
      this.showToast('This is not a gift', 'warning');
      return;
    }
    this.selectedGift = promo;
    this.selectedUserIds = [];
    this.userSearchTerm = '';
    this.showUserSelection = true;
    await this.loadUsers();
  }

  async loadUsers() {
    this.isLoadingUsers = true;
    try {
      const params: any = { limit: 100, page: 1 };
      if (this.userSearchTerm) {
        params.search = this.userSearchTerm;
      }
      const response: any = await this.adminApi.getUsers(params).toPromise();
      
      // Handle different response formats
      if (response && Array.isArray(response)) {
        this.users = response;
      } else if (response && response.users && Array.isArray(response.users)) {
        this.users = response.users;
      } else if (response && response.data && Array.isArray(response.data)) {
        this.users = response.data;
      } else {
        this.users = [];
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.showToast('Failed to load users', 'danger');
      this.users = [];
    } finally {
      this.isLoadingUsers = false;
    }
  }

  toggleUserSelection(userId: string) {
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.includes(userId);
  }

  async sendGiftsToSelectedUsers() {
    if (!this.selectedGift || this.selectedUserIds.length === 0) {
      this.showToast('Please select at least one user', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: `Sending gift to ${this.selectedUserIds.length} user(s)...`,
    });
    await loading.present();

    try {
      let successCount = 0;
      let failCount = 0;

      for (const userId of this.selectedUserIds) {
        try {
          await this.adminApi.assignGiftToUser(this.selectedGift._id, userId).toPromise();
          successCount++;
        } catch (error: any) {
          console.error(`Error sending gift to user ${userId}:`, error);
          failCount++;
        }
      }

      await loading.dismiss();
      
      if (successCount > 0) {
        this.showToast(
          `Gift sent successfully to ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
          failCount > 0 ? 'warning' : 'success'
        );
      } else {
        this.showToast('Failed to send gift to any users', 'danger');
      }

      this.showUserSelection = false;
      this.selectedGift = null;
      this.selectedUserIds = [];
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error sending gifts:', error);
      this.showToast('Failed to send gifts', 'danger');
    }
  }

  cancelUserSelection() {
    this.showUserSelection = false;
    this.selectedGift = null;
    this.selectedUserIds = [];
    this.userSearchTerm = '';
  }

  async onUserSearchChange() {
    await this.loadUsers();
  }
}

