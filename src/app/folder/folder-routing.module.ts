import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FolderPage } from './folder.page';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: FolderPage
  },
  {
    path: 'users',
    loadChildren: () => import('./pages/users/users.module').then( m => m.UsersPageModule)
  },
  {
    path: 'analytics',
    loadChildren: () => import('./pages/analytics/analytics.module').then( m => m.AnalyticsPageModule)
  },
  {
    path: 'drivers',
    loadChildren: () => import('./pages/drivers/drivers.module').then( m => m.DriversPageModule)
  },
  {
    path: 'vendors',
    loadChildren: () => import('./pages/vendors/vendors.module').then( m => m.VendorsPageModule)
  },
  {
    path: 'vehicles',
    loadChildren: () => import('./pages/vehicles/vehicles.module').then( m => m.VehiclesPageModule)
  },
  {
    path: 'rides',
    loadChildren: () => import('./pages/rides/rides.module').then( m => m.RidesPageModule)
  },
  {
    path: 'driver-earnings',
    loadChildren: () => import('./pages/driver-earnings/driver-earnings.module').then( m => m.DriverEarningsPageModule)
  },
  {
    path: 'payouts',
    loadChildren: () => import('./pages/payouts/payouts.module').then( m => m.PayoutsPageModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./pages/settings/settings.module').then( m => m.SettingsPageModule)
  },
  {
    path: 'promo-codes',
    loadChildren: () => import('./pages/promo-codes/promo-codes.module').then( m => m.PromoCodesPageModule)
  },
  {
    path: 'support',
    loadChildren: () => import('./pages/support/support-list/support-list.module').then( m => m.SupportListPageModule)
  },
  {
    path: 'support/:issueId',
    loadChildren: () => import('./pages/support/support-chat/support-chat.module').then( m => m.SupportChatPageModule)
  },
  {
    path: 'emergencies',
    loadChildren: () => import('./pages/emergencies/emergencies.module').then( m => m.EmergenciesPageModule)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FolderPageRoutingModule {}
