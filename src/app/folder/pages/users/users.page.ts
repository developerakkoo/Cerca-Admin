import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: false,
})
export class UsersPage implements OnInit {
  users: any[] = [];
  isLoading = false;
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'blocked' = 'all';

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    const params: any = {
      page: 1,
      limit: 50,
      search: this.searchTerm || undefined,
    };
    if (this.statusFilter === 'active') params.isActive = true;
    if (this.statusFilter === 'blocked') params.isActive = false;

    this.adminApi.getUsers(params).subscribe({
      next: (data) => {
        this.users = data?.users || [];
        this.isLoading = false;
      },
      error: () => {
        this.users = [];
        this.isLoading = false;
      }
    });
  }

  onSearchChange() {
    this.loadUsers();
  }

  async toggleBlock(user: any) {
    const newStatus = !user.isActive;
    this.adminApi.updateUserStatus(user._id, newStatus).subscribe(() => {
      user.isActive = newStatus;
    });
  }

  async toggleVerify(user: any) {
    const newStatus = !user.isVerified;
    this.adminApi.verifyUser(user._id, newStatus).subscribe(() => {
      user.isVerified = newStatus;
    });
  }

  async adjustWallet(user: any) {
    const alert = await this.alertController.create({
      header: 'Adjust Wallet',
      inputs: [
        { name: 'amount', type: 'number', placeholder: 'Amount' },
        { name: 'type', type: 'text', placeholder: 'add or deduct' },
        { name: 'description', type: 'text', placeholder: 'Description (optional)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Apply',
          handler: (data) => {
            const amount = Number(data.amount);
            const type = data.type === 'deduct' ? 'deduct' : 'add';
            this.adminApi.adjustUserWallet(user._id, amount, type, data.description).subscribe();
          }
        }
      ]
    });

    await alert.present();
  }
}
