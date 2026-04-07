import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DriversPage } from './drivers.page';
import { DriverDetailPage } from './driver-detail/driver-detail.page';

const routes: Routes = [
  {
    path: '',
    component: DriversPage
  },
  {
    path: 'driver/:id',
    component: DriverDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DriversPageRoutingModule {}
