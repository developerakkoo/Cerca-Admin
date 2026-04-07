import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DriverEarningsPage } from './driver-earnings.page';
import { DriverDetailEarningsPage } from './driver-detail-earnings.page';

const routes: Routes = [
  {
    path: '',
    component: DriverEarningsPage
  },
  {
    path: ':driverId',
    component: DriverDetailEarningsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DriverEarningsPageRoutingModule {}

