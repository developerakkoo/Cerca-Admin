import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VehiclesPageRoutingModule } from './vehicles-routing.module';
import { VehiclesPage } from './vehicles.page';
import { FleetVehicleDetailPage } from './fleet-vehicle-detail/fleet-vehicle-detail.page';
import { DriverVehicleDetailPage } from './driver-vehicle-detail/driver-vehicle-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VehiclesPageRoutingModule,
    DriverVehicleDetailPage,
  ],
  declarations: [VehiclesPage, FleetVehicleDetailPage],
})
export class VehiclesPageModule {}
