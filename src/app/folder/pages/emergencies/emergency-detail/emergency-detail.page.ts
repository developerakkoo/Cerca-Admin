import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AdminApiService } from '../../../../services/admin-api.service';
import { AdminSocketService } from '../../../../services/admin-socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-emergency-detail',
  templateUrl: './emergency-detail.page.html',
  styleUrls: ['./emergency-detail.page.scss'],
  standalone: false,
})
export class EmergencyDetailPage implements OnInit, OnDestroy {
  emergency: any = null;
  id: string | null = null;
  isLoading = false;
  error: string | null = null;
  liveLocation: { latitude: number; longitude: number; timestamp?: string } | null = null;
  private locationSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminApi: AdminApiService,
    private socketService: AdminSocketService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) {
      this.router.navigate(['/folder/emergencies']);
      return;
    }
    this.loadEmergency();
    this.joinEmergencyRoom();
    this.setupLiveLocationListener();
  }

  ngOnDestroy() {
    this.leaveEmergencyRoom();
    if (this.locationSub) {
      this.locationSub.unsubscribe();
    }
  }

  loadEmergency() {
    if (!this.id) return;
    this.isLoading = true;
    this.error = null;
    this.adminApi.getEmergencyById(this.id).subscribe({
      next: (data) => {
        this.emergency = data?.emergency || null;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load emergency';
        this.emergency = null;
      }
    });
  }

  joinEmergencyRoom() {
    if (!this.id || !this.socketService.isConnected()) return;
    this.socketService.emit('emergency:join', { emergencyId: this.id });
  }

  leaveEmergencyRoom() {
    if (!this.id) return;
    this.socketService.emit('emergency:leave', { emergencyId: this.id });
  }

  setupLiveLocationListener() {
    this.locationSub = this.socketService.onEmergencyLocationUpdate().subscribe((payload: any) => {
      if (payload?.emergencyId !== this.id) return;
      this.liveLocation = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp: payload.timestamp
      };
    });
  }

  getInitialCoords(): { lat: number; lng: number } | null {
    const coords = this.emergency?.location?.coordinates;
    if (!coords || coords.length < 2) return null;
    return { lng: coords[0], lat: coords[1] };
  }

  getMapUrl(): string {
    const c = this.liveLocation ? { lat: this.liveLocation.latitude, lng: this.liveLocation.longitude } : this.getInitialCoords();
    if (!c) return 'https://www.google.com/maps';
    return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
  }

  getReporterName(): string {
    const t = this.emergency?.triggeredBy;
    if (!t) return 'Unknown';
    return t.fullName || t.name || t.email || 'Unknown';
  }

  getRideId(): string {
    const ride = this.emergency?.ride;
    if (!ride) return 'N/A';
    return typeof ride === 'object' ? ride._id : ride;
  }

  async resolve() {
    if (!this.id) return;
    const alert = await this.alertController.create({
      header: 'Resolve Emergency',
      message: 'Mark this emergency as resolved?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Resolve', handler: () => this.doResolve() }
      ]
    });
    await alert.present();
  }

  doResolve() {
    if (!this.id) return;
    this.adminApi.resolveEmergency(this.id).subscribe({
      next: () => {
        this.loadEmergency();
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

  async dismiss() {
    if (!this.id) return;
    const alert = await this.alertController.create({
      header: 'Dismiss Emergency',
      message: 'Dismiss this emergency?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Dismiss', handler: () => this.doDismiss() }
      ]
    });
    await alert.present();
  }

  doDismiss() {
    if (!this.id) return;
    this.adminApi.dismissEmergency(this.id).subscribe({
      next: () => {
        this.loadEmergency();
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
}
