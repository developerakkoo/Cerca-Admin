import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DriverEarningsPageRoutingModule } from './driver-earnings-routing.module';
import { DriverEarningsPage } from './driver-earnings.page';
import { DriverDetailEarningsPage } from './driver-detail-earnings.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DriverEarningsPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [DriverEarningsPage, DriverDetailEarningsPage]
})
export class DriverEarningsPageModule {}

