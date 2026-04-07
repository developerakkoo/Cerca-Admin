import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VendorsPage } from './vendors.page';
import { VendorDetailPage } from './vendor-detail/vendor-detail.page';

const routes: Routes = [
  {
    path: '',
    component: VendorsPage
  },
  {
    path: 'vendor/:id',
    component: VendorDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VendorsPageRoutingModule {}
