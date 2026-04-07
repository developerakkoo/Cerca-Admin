import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PromoCodesPage } from './promo-codes.page';

const routes: Routes = [
  {
    path: '',
    component: PromoCodesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PromoCodesPageRoutingModule {}

