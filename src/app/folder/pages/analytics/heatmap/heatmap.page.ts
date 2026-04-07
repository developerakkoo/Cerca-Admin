import { Component, OnInit, OnDestroy } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { AdminApiService } from '../../../../services/admin-api.service';
import { AlertController } from '@ionic/angular';

declare global {
  interface Window {
    google: any;
  }
}

interface HeatmapZone {
  lat: number;
  lng: number;
  rideCount: number;
  tier: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.page.html',
  styleUrls: ['./heatmap.page.scss'],
  standalone: false,
})
export class HeatmapPage implements OnInit, OnDestroy {
  isLoading = false;
  error: string | null = null;

  startDate = '';
  endDate = '';

  zones: HeatmapZone[] = [];
  summary: { totalRides: number; highThreshold: number; mediumThreshold: number } | null = null;

  private map: any = null;
  private circles: any[] = [];

  private readonly TIER_COLORS = {
    high: { fill: '#EF4444', stroke: '#B91C1C' },
    medium: { fill: '#F59E0B', stroke: '#D97706' },
    low: { fill: '#22C55E', stroke: '#15803D' },
  };

  private readonly DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.endDate = end.toISOString().split('T')[0];
    this.startDate = start.toISOString().split('T')[0];
    this.loadHeatmap();
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  loadHeatmap() {
    this.isLoading = true;
    this.error = null;

    const params: Record<string, string> = {
      startDate: this.startDate,
      endDate: this.endDate,
    };

    this.adminApi.getHeatmapData(params).subscribe({
      next: (data) => {
        this.zones = data?.zones ?? [];
        this.summary = data?.summary ?? null;
        this.isLoading = false;
        setTimeout(() => this.initMap(), 150);
      },
      error: async (err) => {
        this.isLoading = false;
        this.error = err?.error?.message ?? 'Failed to load heatmap data';
        this.zones = [];
        this.summary = null;

        const alert = await this.alertController.create({
          header: 'Error',
          message: this.error ?? 'An error occurred',
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  onDateFilterChange() {
    if (this.startDate && this.endDate) {
      if (new Date(this.startDate) > new Date(this.endDate)) {
        this.alertController
          .create({
            header: 'Invalid Date Range',
            message: 'Start date must be before end date',
            buttons: ['OK'],
          })
          .then((a) => a.present());
        return;
      }
      this.loadHeatmap();
    }
  }

  private loadGoogleMaps(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    const w = window as any;
    if (w.google?.maps) return Promise.resolve();
    const key = environment.googleMapsApiKey ?? '';
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
      const callbackName = '__adminHeatmapMapReady';
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
    const el = document.getElementById('heatmap-map');
    if (!el) return;

    this.loadGoogleMaps()
      .then(() => {
        const el2 = document.getElementById('heatmap-map');
        if (!el2 || !(window as any).google?.maps) return;

        const google = (window as any).google;

        const center = this.zones.length
          ? { lat: this.zones[0].lat, lng: this.zones[0].lng }
          : this.DEFAULT_CENTER;

        this.map = new google.maps.Map(el2, {
          center,
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        this.clearCircles();

        for (const zone of this.zones) {
          const colors = this.TIER_COLORS[zone.tier];
          const radius = Math.max(300, Math.min(1200, zone.rideCount * 15));

          const circle = new google.maps.Circle({
            map: this.map,
            center: { lat: zone.lat, lng: zone.lng },
            radius,
            fillColor: colors.fill,
            fillOpacity: 0.45,
            strokeColor: colors.stroke,
            strokeOpacity: 0.8,
            strokeWeight: 1.5,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding:8px"><strong>Rides: ${zone.rideCount}</strong><br/>Tier: ${zone.tier}</div>`,
          });

          circle.addListener('click', () => {
            infoWindow.setPosition({ lat: zone.lat, lng: zone.lng });
            infoWindow.open(this.map);
          });

          this.circles.push(circle);
        }

        if (this.zones.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          for (const zone of this.zones) {
            bounds.extend({ lat: zone.lat, lng: zone.lng });
          }
          this.map.fitBounds(bounds);
        } else if (this.zones.length === 1) {
          this.map.setCenter({ lat: this.zones[0].lat, lng: this.zones[0].lng });
          this.map.setZoom(14);
        }

        setTimeout(() => {
          if (this.map) google.maps.event.trigger(this.map, 'resize');
        }, 200);
      })
      .catch((err) => console.warn('Heatmap map load failed:', err));
  }

  private clearCircles() {
    for (const circle of this.circles) {
      if (circle.setMap) circle.setMap(null);
    }
    this.circles = [];
  }

  private destroyMap() {
    this.clearCircles();
    this.map = null;
  }
}
