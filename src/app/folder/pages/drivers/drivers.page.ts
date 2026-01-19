import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.page.html',
  styleUrls: ['./drivers.page.scss'],
  standalone: false,
})
export class DriversPage implements OnInit {
  drivers: any[] = [];
  isLoading = false;
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'pending' = 'all';

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadDrivers();
  }

  loadDrivers() {
    this.isLoading = true;
    const params: any = {
      page: 1,
      limit: 50,
      search: this.searchTerm || undefined,
    };
    if (this.statusFilter === 'active') params.isActive = true;
    if (this.statusFilter === 'pending') params.isActive = false;

    this.adminApi.getDrivers(params).subscribe({
      next: (data) => {
        this.drivers = data?.drivers || [];
        this.isLoading = false;
      },
      error: () => {
        this.drivers = [];
        this.isLoading = false;
      }
    });
  }

  onSearchChange() {
    this.loadDrivers();
  }

  approveDriver(driver: any) {
    this.adminApi.approveDriver(driver._id).subscribe(() => {
      driver.isActive = true;
    });
  }

  rejectDriver(driver: any) {
    this.adminApi.rejectDriver(driver._id).subscribe(() => {
      driver.isActive = false;
    });
  }

  toggleVerify(driver: any) {
    const newStatus = !driver.isVerified;
    this.adminApi.verifyDriver(driver._id, newStatus).subscribe(() => {
      driver.isVerified = newStatus;
    });
  }

  async toggleBlock(driver: any) {
    const newStatus = !driver.isActive;
    this.adminApi.updateDriverStatus(driver._id, newStatus).subscribe(() => {
      driver.isActive = newStatus;
    });
  }

  async viewDocuments(driver: any) {
    const alert = await this.alertController.create({
      header: 'Driver Documents',
      message: driver.documents?.length ? driver.documents.join('<br/>') : 'No documents',
      buttons: ['OK']
    });
    await alert.present();
  }
}
