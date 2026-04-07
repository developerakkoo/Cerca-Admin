import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RidesPageRoutingModule } from './rides-routing.module';

import { RidesPage } from './rides.page';
import { RideDetailPage } from './ride-detail/ride-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RidesPageRoutingModule
  ],
  declarations: [RidesPage, RideDetailPage]
})
export class RidesPageModule {}
