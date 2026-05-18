import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RidesPageRoutingModule } from './rides-routing.module';

import { RidesPage } from './rides.page';
import { RideDetailPage } from './ride-detail/ride-detail.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RidesPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [RidesPage, RideDetailPage]
})
export class RidesPageModule {}
