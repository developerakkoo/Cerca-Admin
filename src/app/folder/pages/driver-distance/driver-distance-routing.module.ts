import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DriverDistancePage } from './driver-distance.page';

const routes: Routes = [
  {
    path: '',
    component: DriverDistancePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DriverDistancePageRoutingModule {}
