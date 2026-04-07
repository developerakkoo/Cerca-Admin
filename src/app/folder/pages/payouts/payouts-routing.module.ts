import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PayoutsPage } from './payouts.page';

const routes: Routes = [
  {
    path: '',
    component: PayoutsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PayoutsPageRoutingModule {}

