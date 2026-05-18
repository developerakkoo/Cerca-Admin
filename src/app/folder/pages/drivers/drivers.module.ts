import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DriversPageRoutingModule } from './drivers-routing.module';

import { DriversPage } from './drivers.page';
import { DriverDetailPage } from './driver-detail/driver-detail.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    DriversPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [DriversPage, DriverDetailPage]
})
export class DriversPageModule {}
