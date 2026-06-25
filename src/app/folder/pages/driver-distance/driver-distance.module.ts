import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DriverDistancePageRoutingModule } from './driver-distance-routing.module';
import { DriverDistancePage } from './driver-distance.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DriverDistancePageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [DriverDistancePage],
})
export class DriverDistancePageModule {}
