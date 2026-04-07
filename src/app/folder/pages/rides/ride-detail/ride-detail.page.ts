import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AdminApiService } from '../../../../services/admin-api.service';
import { AdminSocketService } from '../../../../services/admin-socket.service';

declare global {
  interface Window {
    google: any;
    initRideDetailMap?: () => void;
  }
}

@Component({
  selector: 'app-ride-detail',
  templateUrl: './ride-detail.page.html',
  styleUrls: ['./ride-detail.page.scss'],
  standalone: false,
})
export class RideDetailPage implements OnInit, OnDestroy {
  ride: any = null;
  timeline: any[] = [];
  rideId: string | null = null;
  isLoading = false;
  error: string | null = null;

  driverLocation: { lat: number; lng: number } | null = null;
  private map: any = null;
  private pickupMarker: any = null;
  private dropoffMarker: any = null;
  private driverMarker: any = null;
  private subs: Subscription[] = [];

  private readonly ACTIVE_STATUSES = ['requested', 'accepted', 'arrived', 'in_progress'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminApi: AdminApiService,
    private socketService: AdminSocketService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.rideId = this.route.snapshot.paramMap.get('id');
    if (!this.rideId) {
      this.router.navigate(['/folder/rides']);
      return;
    }
    this.loadRide();
    this.loadTimeline();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (this.rideId) {
      this.socketService.adminLeaveRideRoom(this.rideId);
    }
    this.destroyMap();
  }

  loadRide() {
    if (!this.rideId) return;
    this.isLoading = true;
    this.error = null;
    this.adminApi.getRideById(this.rideId).subscribe({
      next: (data) => {
        this.ride = data?.ride || null;
        this.isLoading = false;
        if (this.ride) {
          setTimeout(() => this.initMap(), 100);
          if (this.isActive(this.ride)) {
            this.socketService.adminJoinRideRoom(this.rideId!);
            this.setupSocketListeners();
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load ride';
        this.ride = null;
      },
    });
  }

  loadTimeline() {
    if (!this.rideId) return;
    this.adminApi.getRideTimeline(this.rideId).subscribe({
      next: (data) => {
        this.timeline = data?.events || [];
      },
    });
  }

  isActive(ride: any): boolean {
    return ride && this.ACTIVE_STATUSES.includes(ride.status);
  }

  private setupSocketListeners() {
    if (!this.rideId) return;
    const rideId = this.rideId;

    const locSub = this.socketService.on<any>('driverLocationUpdate').subscribe((data: any) => {
      if (data?.rideId !== rideId) return;
      const coords = data?.location?.coordinates || data?.coordinates;
      if (coords && coords.length >= 2) {
        this.driverLocation = { lat: coords[1], lng: coords[0] };
        this.updateDriverMarker();
      }
    });
    this.subs.push(locSub);

    const rideLocSub = this.socketService.on<any>('rideLocationUpdate').subscribe((data: any) => {
      if (data?.rideId !== rideId) return;
      const coords = data?.location?.coordinates || data?.coordinates;
      if (coords && coords.length >= 2) {
        this.driverLocation = { lat: coords[1], lng: coords[0] };
        this.updateDriverMarker();
      }
    });
    this.subs.push(rideLocSub);

    const statusSub = this.socketService.on<any>('rideStatusUpdated').subscribe((data: any) => {
      if (data?.rideId !== rideId) return;
      if (this.ride) this.ride.status = data?.status || this.ride.status;
      if (data?.ride) this.ride = { ...this.ride, ...data.ride };
    });
    this.subs.push(statusSub);

    const completedSub = this.socketService.on<any>('rideCompleted').subscribe((data: any) => {
      if (data?._id === rideId || data?.rideId === rideId) {
        this.ride = data?.ride || data;
        if (this.ride) this.ride.status = 'completed';
        this.loadRide();
      }
    });
    this.subs.push(completedSub);

    const cancelledSub = this.socketService.on<any>('rideCancelled').subscribe((data: any) => {
      const id = data?.rideId || data?._id;
      if (id === rideId) {
        this.ride = data?.ride || data;
        if (this.ride) this.ride.status = 'cancelled';
        this.loadRide();
      }
    });
    this.subs.push(cancelledSub);
  }

  /**
   * Load Google Maps JavaScript API (same approach as Cerca MapService / shared-ride).
   * Uses callback so the API is ready before we create the map.
   */
  private loadGoogleMaps(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    const w = window as any;
    if (w.google?.maps) return Promise.resolve();
    const key = environment.googleMapsApiKey || '';
    if (!key) return Promise.reject(new Error('Google Maps API key not set'));
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) {
        const check = () => {
          if (w.google?.maps) resolve();
          else setTimeout(check, 50);
        };
        check();
        return;
      }
      const callbackName = '__adminRideMapReady';
      w[callbackName] = () => {
        w[callbackName] = null;
        resolve();
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        w[callbackName] = null;
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
  }

  private initMap() {
    const pickup = this.getPickupCoords();
    if (!pickup) return;
    const el = document.getElementById('ride-detail-map');
    if (!el) return;
    this.loadGoogleMaps()
      .then(() => {
        const el2 = document.getElementById('ride-detail-map');
        if (!el2 || !(window as any).google?.maps) return;
        const google = (window as any).google;
        this.map = new google.maps.Map(el2, {
          center: pickup,
          zoom: 14,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        this.pickupMarker = new google.maps.Marker({
          position: pickup,
          map: this.map,
          title: 'Pickup',
          label: { text: 'P', color: 'white', fontWeight: 'bold' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#22C55E',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          },
        });

        const dropoff = this.getDropoffCoords();
        if (dropoff) {
          this.dropoffMarker = new google.maps.Marker({
            position: dropoff,
            map: this.map,
            title: 'Dropoff',
            label: { text: 'D', color: 'white', fontWeight: 'bold' },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#c5000f',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
            },
          });
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(pickup);
          bounds.extend(dropoff);
          this.map.fitBounds(bounds);
        }

        if (this.driverLocation) this.updateDriverMarker();

        // Resize map after container is laid out (fixes blank map in dynamic content)
        setTimeout(() => {
          if (this.map) google.maps.event.trigger(this.map, 'resize');
        }, 200);
      })
      .catch((err) => console.warn('Ride detail map load failed:', err));
  }

  private updateDriverMarker() {
    if (!this.driverLocation || !this.map || !(window as any).google?.maps) return;
    const google = (window as any).google;
    const pos = { lat: this.driverLocation.lat, lng: this.driverLocation.lng };
    if (this.driverMarker) {
      this.driverMarker.setPosition(pos);
    } else {
      this.driverMarker = new google.maps.Marker({
        position: pos,
        map: this.map,
        title: 'Driver',
        label: { text: '🚗', color: 'transparent' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      });
    }
  }

  private destroyMap() {
    this.pickupMarker = null;
    this.dropoffMarker = null;
    this.driverMarker = null;
    this.map = null;
  }

  getPickupCoords(): { lat: number; lng: number } | null {
    const c = this.ride?.pickupLocation?.coordinates;
    if (!c || c.length < 2) return null;
    return { lng: c[0], lat: c[1] };
  }

  getDropoffCoords(): { lat: number; lng: number } | null {
    const c = this.ride?.dropoffLocation?.coordinates;
    if (!c || c.length < 2) return null;
    return { lng: c[0], lat: c[1] };
  }

  riderName(): string {
    const r = this.ride?.rider;
    if (!r) return '—';
    return r.fullName || r.name || r.phoneNumber || '—';
  }

  driverName(): string {
    const d = this.ride?.driver;
    if (!d) return '—';
    return d.name || d.phone || '—';
  }

  getMapUrl(): string {
    const c = this.driverLocation || this.getPickupCoords();
    if (!c) return 'https://www.google.com/maps';
    return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
  }

  async cancelRide() {
    if (!this.rideId) return;
    const alert = await this.alertController.create({
      header: 'Cancel Ride',
      message: 'Enter cancellation reason (optional):',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Reason' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Cancel Ride',
          handler: (data) => {
            const reason = data?.reason?.trim() || 'Cancelled by admin';
            this.adminApi.cancelRide(this.rideId!, reason).subscribe({
              next: () => {
                this.loadRide();
                this.toastController.create({ message: 'Ride cancelled', color: 'success', duration: 2000 }).then(t => t.present());
              },
              error: (err) => {
                this.toastController.create({
                  message: err?.error?.message || 'Failed to cancel ride',
                  color: 'danger',
                  duration: 3000,
                }).then(t => t.present());
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async assignDriver() {
    if (!this.rideId) return;
    const alert = await this.alertController.create({
      header: 'Assign Driver',
      message: 'Enter driver ID (MongoDB ObjectId):',
      inputs: [{ name: 'driverId', type: 'text', placeholder: 'Driver ID' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Assign',
          handler: (data) => {
            const driverId = data?.driverId?.trim();
            if (!driverId) {
              this.toastController.create({ message: 'Driver ID required', color: 'warning', duration: 2000 }).then(t => t.present());
              return;
            }
            this.adminApi.assignDriver(this.rideId!, driverId).subscribe({
              next: () => {
                this.loadRide();
                this.toastController.create({ message: 'Driver assigned', color: 'success', duration: 2000 }).then(t => t.present());
              },
              error: (err) => {
                this.toastController.create({
                  message: err?.error?.message || 'Failed to assign driver',
                  color: 'danger',
                  duration: 3000,
                }).then(t => t.present());
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  back() {
    this.router.navigate(['/folder/rides']);
  }
}
