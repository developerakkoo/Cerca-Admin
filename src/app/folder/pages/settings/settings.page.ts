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
            vehicleServices: this.getDefaultVehicleServices()
          };
        } else {
          this.settings = {
            ...data,
            systemSettings: data.systemSettings || {
              maintenanceMode: false,
              forceUpdate: false
            },
            pricingConfigurations: data.pricingConfigurations || {
              perKmRate: 0,
              minimumFare: 0,
              platformFees: 0,
              driverCommissions: 0
            },
            services: data.services || [],
            vehicleServices: data.vehicleServices || this.getDefaultVehicleServices()
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
            vehicleServices: this.getDefaultVehicleServices()
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

  getDefaultVehicleServices() {
    return {
      cercaSmall: {
        name: 'Cerca Small',
        price: 299,
        perMinuteRate: 2,
        seats: 4,
        enabled: true,
        imagePath: 'assets/cars/cerca-small.png'
      },
      cercaMedium: {
        name: 'Cerca Medium',
        price: 499,
        perMinuteRate: 3,
        seats: 6,
        enabled: true,
        imagePath: 'assets/cars/Cerca-medium.png'
      },
      cercaLarge: {
        name: 'Cerca Large',
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

    // Validate Cerca Small
    if (vs.cercaSmall?.enabled) {
      if (vs.cercaSmall.price === undefined || vs.cercaSmall.price < 0) {
        return 'Cerca Small price must be a positive number';
      }
      if (vs.cercaSmall.perMinuteRate === undefined || vs.cercaSmall.perMinuteRate === null || vs.cercaSmall.perMinuteRate < 0) {
        return 'Cerca Small per minute rate must be a positive number';
      }
      if (vs.cercaSmall.seats === undefined || vs.cercaSmall.seats < 1) {
        return 'Cerca Small seats must be at least 1';
      }
    }

    // Validate Cerca Medium
    if (vs.cercaMedium?.enabled) {
      if (vs.cercaMedium.price === undefined || vs.cercaMedium.price < 0) {
        return 'Cerca Medium price must be a positive number';
      }
      if (vs.cercaMedium.perMinuteRate === undefined || vs.cercaMedium.perMinuteRate === null || vs.cercaMedium.perMinuteRate < 0) {
        return 'Cerca Medium per minute rate must be a positive number';
      }
      if (vs.cercaMedium.seats === undefined || vs.cercaMedium.seats < 1) {
        return 'Cerca Medium seats must be at least 1';
      }
    }

    // Validate Cerca Large
    if (vs.cercaLarge?.enabled) {
      if (vs.cercaLarge.price === undefined || vs.cercaLarge.price < 0) {
        return 'Cerca Large price must be a positive number';
      }
      if (vs.cercaLarge.perMinuteRate === undefined || vs.cercaLarge.perMinuteRate === null || vs.cercaLarge.perMinuteRate < 0) {
        return 'Cerca Large per minute rate must be a positive number';
      }
      if (vs.cercaLarge.seats === undefined || vs.cercaLarge.seats < 1) {
        return 'Cerca Large seats must be at least 1';
      }
    }

    return null;
  }

  onVehicleServiceToggle(serviceType: 'cercaSmall' | 'cercaMedium' | 'cercaLarge') {
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
