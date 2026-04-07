import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DriverEarningsPageRoutingModule } from './driver-earnings-routing.module';
import { DriverEarningsPage } from './driver-earnings.page';
import { DriverDetailEarningsPage } from './driver-detail-earnings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DriverEarningsPageRoutingModule
  ],
  declarations: [DriverEarningsPage, DriverDetailEarningsPage]
})
export class DriverEarningsPageModule {}

