import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-emergencies',
  templateUrl: './emergencies.page.html',
  styleUrls: ['./emergencies.page.scss'],
  standalone: false,
})
export class EmergenciesPage implements OnInit {
  emergencies: any[] = [];
  isLoading = false;
  error: string | null = null;
  statusFilter: 'all' | 'active' | 'resolved' | 'dismissed' = 'all';

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadEmergencies();
  }

  ionViewWillEnter() {
    this.loadEmergencies();
  }

  loadEmergencies() {
    this.isLoading = true;
    this.error = null;

    const params: any = { limit: 50, skip: 0 };
    if (this.statusFilter !== 'all') {
      params.status = this.statusFilter;
    }

    this.adminApi.getEmergencies(params).subscribe({
      next: (data) => {
        this.emergencies = data?.emergencies || [];
        this.isLoading = false;
      },
      error: async (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load emergencies';
        this.emergencies = [];
        const toast = await this.toastController.create({
          message: this.error ?? 'Failed to load emergencies',
          color: 'danger',
          duration: 3000
        });
        await toast.present();
      }
    });
  }

  onFilterChange() {
    this.loadEmergencies();
  }

  viewDetail(emergency: any) {
    this.router.navigate(['/folder/emergencies', emergency._id]);
  }

  async resolve(emergency: any, e: Event) {
    e.stopPropagation();
    const alert = await this.alertController.create({
      header: 'Resolve Emergency',
      message: `Mark emergency ${emergency._id} as resolved?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Resolve',
          handler: () => this.doResolve(emergency._id)
        }
      ]
    });
    await alert.present();
  }

  doResolve(id: string) {
    this.adminApi.resolveEmergency(id).subscribe({
      next: () => {
        this.loadEmergencies();
        this.toastController.create({ message: 'Emergency resolved', color: 'success', duration: 2000 }).then(t => t.present());
      },
      error: (err) => {
        this.toastController.create({
          message: err?.error?.message || 'Failed to resolve',
          color: 'danger',
          duration: 3000
        }).then(t => t.present());
      }
    });
  }

  async dismiss(emergency: any, e: Event) {
    e.stopPropagation();
    const alert = await this.alertController.create({
      header: 'Dismiss Emergency',
      message: `Dismiss emergency ${emergency._id}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Dismiss',
          handler: () => this.doDismiss(emergency._id)
        }
      ]
    });
    await alert.present();
  }

  doDismiss(id: string) {
    this.adminApi.dismissEmergency(id).subscribe({
      next: () => {
        this.loadEmergencies();
        this.toastController.create({ message: 'Emergency dismissed', color: 'success', duration: 2000 }).then(t => t.present());
      },
      error: (err) => {
        this.toastController.create({
          message: err?.error?.message || 'Failed to dismiss',
          color: 'danger',
          duration: 3000
        }).then(t => t.present());
      }
    });
  }

  getReporterName(emergency: any): string {
    const t = emergency?.triggeredBy;
    if (!t) return 'Unknown';
    return t.fullName || t.name || t.email || 'Unknown';
  }

  getLocationStr(emergency: any): string {
    const coords = emergency?.location?.coordinates;
    if (!coords || coords.length < 2) return 'N/A';
    const [lng, lat] = coords;
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  getRideId(emergency: any): string {
    const ride = emergency?.ride;
    if (!ride) return 'N/A';
    return typeof ride === 'object' ? ride._id : ride;
  }
}
