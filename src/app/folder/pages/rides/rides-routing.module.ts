import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RidesPage } from './rides.page';
import { RideDetailPage } from './ride-detail/ride-detail.page';

const routes: Routes = [
  {
    path: '',
    component: RidesPage
  },
  {
    path: 'ride/:id',
    component: RideDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RidesPageRoutingModule {}
