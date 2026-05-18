import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../../services/admin-api.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  isLoading = false;
  isSaving = false;
  settings: any = null;
  error: string | null = null;

  constructor(
    private adminApi: AdminApiService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading = true;
    this.error = null;
    this.adminApi.getSettings().subscribe({
      next: (data) => {
        // Initialize settings structure if needed
        if (!data) {
          this.settings = {
            systemSettings: {
              maintenanceMode: false,
              forceUpdate: false
            },
            pricingConfigurations: {
              perKmRate: 0,
              minimumFare: 0,
              platformFees: 0,
              driverCommissions: 0
            },
            services: [],
            vehicleServices: this.getDefaultVehicleServices(),
            rideMatching: this.getDefaultRideMatching()
          };
        } else {
          this.settings = {
            ...data,
            systemSettings: data.systemSettings || {
              maintenanceMode: false,
              forceUpdate: false
            },
            pricingConfigurations: this.mergePricingConfigurations(
              data.pricingConfigurations
            ),
            services: data.services || [],
            vehicleServices: data.vehicleServices || this.getDefaultVehicleServices(),
            rideMatching: this.mergeRideMatching(data.rideMatching)
          };
        }
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        this.error = error?.error?.message || 'Failed to load settings';
        
        // If settings don't exist, initialize empty structure
        if (error.status === 404) {
          this.settings = {
            systemSettings: {
              maintenanceMode: false,
              forceUpdate: false
            },
            pricingConfigurations: {
              perKmRate: 0,
              minimumFare: 0,
              platformFees: 0,
              driverCommissions: 0
            },
            services: [],
            vehicleServices: this.getDefaultVehicleServices(),
            rideMatching: this.getDefaultRideMatching()
          };
        } else {
          const alert = await this.alertController.create({
            header: 'Error',
            message: this.error || 'An error occurred',
            buttons: [
              {
                text: 'Retry',
                handler: () => this.loadSettings()
              },
              {
                text: 'OK',
                role: 'cancel'
              }
            ]
          });
          await alert.present();
        }
      }
    });
  }

  async saveSettings() {
    if (!this.settings) return;
    
    // Validate vehicle services prices
    if (this.settings.vehicleServices) {
      const validationError = this.validateVehicleServices();
      if (validationError) {
        const toast = await this.toastController.create({
          message: validationError,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
        return;
      }
    }
    
    this.isSaving = true;
    this.adminApi.updateSettings(this.settings).subscribe({
      next: async (data) => {
        this.isSaving = false;
        this.settings = data || this.settings;
        const toast = await this.toastController.create({
          message: 'Settings saved successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      },
      error: async (error) => {
        this.isSaving = false;
        const toast = await this.toastController.create({
          message: error?.error?.message || 'Failed to save settings',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  getDefaultFarePricing(perKmRate = 12) {
    const rate = Number(perKmRate) || 12;
    return {
      enabled: false,
      timezone: 'Asia/Kolkata',
      distanceTiers: {
        tier1: { maxKm: 10, ratePerKm: rate },
        tier2: { maxKm: 20, ratePerKm: rate },
        tier3: { maxKm: 30, ratePerKm: rate },
        beyondTier3RatePerKm: rate,
      },
      timeBands: [
        { id: 'morning', label: 'Morning peak', start: '06:00', end: '10:00', multiplier: 1.2 },
        { id: 'day', label: 'Day', start: '10:00', end: '17:00', multiplier: 1.0 },
        { id: 'evening', label: 'Evening peak', start: '17:00', end: '22:00', multiplier: 1.5 },
        { id: 'night', label: 'Night', start: '22:00', end: '06:00', multiplier: 1.8 },
      ],
      timeMultiplierAppliesTo: 'distanceAndTime',
    };
  }

  mergePricingConfigurations(pc: any) {
    const base = pc || {
      baseFare: 0,
      perKmRate: 12,
      minimumFare: 0,
      platformFees: 0,
      driverCommissions: 0,
      cancellationFees: 0,
    };
    const perKm = Number(base.perKmRate) || 12;
    const farePricing = base.farePricing
      ? {
          ...this.getDefaultFarePricing(perKm),
          ...base.farePricing,
          distanceTiers: {
            ...this.getDefaultFarePricing(perKm).distanceTiers,
            ...(base.farePricing.distanceTiers || {}),
            tier1: {
              ...this.getDefaultFarePricing(perKm).distanceTiers.tier1,
              ...(base.farePricing.distanceTiers?.tier1 || {}),
            },
            tier2: {
              ...this.getDefaultFarePricing(perKm).distanceTiers.tier2,
              ...(base.farePricing.distanceTiers?.tier2 || {}),
            },
            tier3: {
              ...this.getDefaultFarePricing(perKm).distanceTiers.tier3,
              ...(base.farePricing.distanceTiers?.tier3 || {}),
            },
          },
          timeBands:
            Array.isArray(base.farePricing.timeBands) &&
            base.farePricing.timeBands.length
              ? base.farePricing.timeBands
              : this.getDefaultFarePricing(perKm).timeBands,
        }
      : this.getDefaultFarePricing(perKm);
    return { ...base, farePricing };
  }

  getDefaultRideMatching() {
    return {
      destinationReachRadiusMeters: 1500,
      stackedAccept: { enabled: true }
    };
  }

  mergeRideMatching(rideMatching: any) {
    const defaults = this.getDefaultRideMatching();
    if (!rideMatching) return defaults;
    return {
      destinationReachRadiusMeters:
        rideMatching.destinationReachRadiusMeters ??
        defaults.destinationReachRadiusMeters,
      stackedAccept: {
        enabled:
          rideMatching.stackedAccept?.enabled !== undefined
            ? rideMatching.stackedAccept.enabled
            : defaults.stackedAccept.enabled
      }
    };
  }

  getDefaultVehicleServices() {
    return {
      cercaZip: {
        name: 'Cerca Zip',
        price: 299,
        perMinuteRate: 2,
        seats: 4,
        enabled: true,
        imagePath: 'assets/cars/cerca-small.png'
      },
      cercaGlide: {
        name: 'Cerca Glide',
        price: 499,
        perMinuteRate: 3,
        seats: 6,
        enabled: true,
        imagePath: 'assets/cars/Cerca-medium.png'
      },
      cercaTitan: {
        name: 'Cerca Titan',
        price: 699,
        perMinuteRate: 4,
        seats: 8,
        enabled: true,
        imagePath: 'assets/cars/cerca-large.png'
      }
    };
  }

  validateVehicleServices(): string | null {
    if (!this.settings?.vehicleServices) return null;

    const vs = this.settings.vehicleServices;

    // Validate Cerca Zip
    if (vs.cercaZip?.enabled) {
      if (vs.cercaZip.price === undefined || vs.cercaZip.price < 0) {
        return 'Cerca Zip price must be a positive number';
      }
      if (vs.cercaZip.perMinuteRate === undefined || vs.cercaZip.perMinuteRate === null || vs.cercaZip.perMinuteRate < 0) {
        return 'Cerca Zip per minute rate must be a positive number';
      }
      if (vs.cercaZip.seats === undefined || vs.cercaZip.seats < 1) {
        return 'Cerca Zip seats must be at least 1';
      }
    }

    // Validate Cerca Glide
    if (vs.cercaGlide?.enabled) {
      if (vs.cercaGlide.price === undefined || vs.cercaGlide.price < 0) {
        return 'Cerca Glide price must be a positive number';
      }
      if (vs.cercaGlide.perMinuteRate === undefined || vs.cercaGlide.perMinuteRate === null || vs.cercaGlide.perMinuteRate < 0) {
        return 'Cerca Glide per minute rate must be a positive number';
      }
      if (vs.cercaGlide.seats === undefined || vs.cercaGlide.seats < 1) {
        return 'Cerca Glide seats must be at least 1';
      }
    }

    // Validate Cerca Titan
    if (vs.cercaTitan?.enabled) {
      if (vs.cercaTitan.price === undefined || vs.cercaTitan.price < 0) {
        return 'Cerca Titan price must be a positive number';
      }
      if (vs.cercaTitan.perMinuteRate === undefined || vs.cercaTitan.perMinuteRate === null || vs.cercaTitan.perMinuteRate < 0) {
        return 'Cerca Titan per minute rate must be a positive number';
      }
      if (vs.cercaTitan.seats === undefined || vs.cercaTitan.seats < 1) {
        return 'Cerca Titan seats must be at least 1';
      }
    }

    return null;
  }

  onVehicleServiceToggle(serviceType: 'cercaZip' | 'cercaGlide' | 'cercaTitan') {
    // Ensure vehicle services structure exists
    if (!this.settings.vehicleServices) {
      this.settings.vehicleServices = this.getDefaultVehicleServices();
    }
    
    // If enabling, ensure default values are set
    if (this.settings.vehicleServices[serviceType]?.enabled) {
      const defaults = this.getDefaultVehicleServices();
      if (!this.settings.vehicleServices[serviceType].name) {
        this.settings.vehicleServices[serviceType].name = defaults[serviceType].name;
      }
      if (this.settings.vehicleServices[serviceType].price === undefined) {
        this.settings.vehicleServices[serviceType].price = defaults[serviceType].price;
      }
      if (this.settings.vehicleServices[serviceType].seats === undefined) {
        this.settings.vehicleServices[serviceType].seats = defaults[serviceType].seats;
      }
      if (!this.settings.vehicleServices[serviceType].imagePath) {
        this.settings.vehicleServices[serviceType].imagePath = defaults[serviceType].imagePath;
      }
    }
  }

  async toggleMaintenanceMode() {
    if (!this.settings?.systemSettings) return;
    
    const newValue = !this.settings.systemSettings.maintenanceMode;
    const action = newValue ? 'enable' : 'disable';
    
    const alert = await this.alertController.create({
      header: `${action === 'enable' ? 'Enable' : 'Disable'} Maintenance Mode`,
      message: `Are you sure you want to ${action} maintenance mode? This will ${newValue ? 'prevent' : 'allow'} users from accessing the app.`,
      buttons: [
        { text: 'Cancel', role: 'cancel', handler: () => {
          // Revert toggle
          this.settings.systemSettings.maintenanceMode = !newValue;
        }},
        {
          text: 'Confirm',
          handler: () => {
            this.saveSettings();
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleForceUpdate() {
    if (!this.settings?.systemSettings) return;
    
    const newValue = !this.settings.systemSettings.forceUpdate;
    const action = newValue ? 'enable' : 'disable';
    
    const alert = await this.alertController.create({
      header: `${action === 'enable' ? 'Enable' : 'Disable'} Force Update`,
      message: `Are you sure you want to ${action} force update? This will ${newValue ? 'force' : 'allow'} users to update the app.`,
      buttons: [
        { text: 'Cancel', role: 'cancel', handler: () => {
          // Revert toggle
          this.settings.systemSettings.forceUpdate = !newValue;
        }},
        {
          text: 'Confirm',
          handler: () => {
            this.saveSettings();
          }
        }
      ]
    });
    await alert.present();
  }
}
