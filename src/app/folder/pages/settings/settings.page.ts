import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../../services/admin-api.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  isLoading = false;
  settings: any = null;

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading = true;
    this.adminApi.getSettings().subscribe({
      next: (data) => {
        this.settings = data || null;
        this.isLoading = false;
      },
      error: () => {
        this.settings = null;
        this.isLoading = false;
      }
    });
  }

  saveSettings() {
    if (!this.settings) return;
    this.adminApi.updateSettings(this.settings).subscribe();
  }
}
