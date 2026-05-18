import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentDisputesPage } from './payment-disputes.page';

const routes: Routes = [{ path: '', component: PaymentDisputesPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaymentDisputesPageRoutingModule {}
