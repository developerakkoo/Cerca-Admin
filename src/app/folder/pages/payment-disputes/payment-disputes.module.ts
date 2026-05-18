import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PaymentDisputesPageRoutingModule } from './payment-disputes-routing.module';
import { PaymentDisputesPage } from './payment-disputes.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PaymentDisputesPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [PaymentDisputesPage],
})
export class PaymentDisputesPageModule {}
