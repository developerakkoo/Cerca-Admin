import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VehiclesPage } from './vehicles.page';
import { FleetVehicleDetailPage } from './fleet-vehicle-detail/fleet-vehicle-detail.page';
import { DriverVehicleDetailPage } from './driver-vehicle-detail/driver-vehicle-detail.page';

const routes: Routes = [
  {
    path: '',
    component: VehiclesPage,
  },
  {
    path: 'fleet/:id',
    component: FleetVehicleDetailPage,
  },
  {
    path: 'driver/:driverId',
    component: DriverVehicleDetailPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VehiclesPageRoutingModule {}
