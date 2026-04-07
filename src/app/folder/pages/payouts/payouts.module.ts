import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PayoutsPageRoutingModule } from './payouts-routing.module';
import { PayoutsPage } from './payouts.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PayoutsPageRoutingModule
  ],
  declarations: [PayoutsPage]
})
export class PayoutsPageModule {}

