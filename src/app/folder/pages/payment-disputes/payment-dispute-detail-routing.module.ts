import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentDisputeDetailPage } from './payment-dispute-detail.page';

const routes: Routes = [{ path: '', component: PaymentDisputeDetailPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaymentDisputeDetailPageRoutingModule {}
