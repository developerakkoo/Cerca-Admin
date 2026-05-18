import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PayoutsPageRoutingModule } from './payouts-routing.module';
import { PayoutsPage } from './payouts.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PayoutsPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [PayoutsPage]
})
export class PayoutsPageModule {}

