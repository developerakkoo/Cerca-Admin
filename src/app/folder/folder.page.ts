import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit {
  public folder!: string;
  private activatedRoute = inject(ActivatedRoute);
  
  // Dashboard statistics
  dashboardStats = {
    totalUsers: 1248,
    activeDrivers: 342,
    totalRides: 15678,
    revenue: 125430,
    pendingRequests: 23,
    completedRides: 15234
  };

  // Recent activities
  recentActivities = [
    { type: 'user', message: 'New user registered', time: '2 mins ago', icon: 'person-add-outline' },
    { type: 'ride', message: 'Ride completed', time: '5 mins ago', icon: 'checkmark-circle-outline' },
    { type: 'driver', message: 'New driver approved', time: '10 mins ago', icon: 'car-outline' },
    { type: 'payment', message: 'Payment received', time: '15 mins ago', icon: 'cash-outline' },
    { type: 'user', message: 'User profile updated', time: '20 mins ago', icon: 'person-outline' }
  ];

  constructor() {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }

  get isDashboard(): boolean {
    return this.folder === 'dashboard';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
