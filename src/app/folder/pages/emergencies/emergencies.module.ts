import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EmergenciesPageRoutingModule } from './emergencies-routing.module';

import { EmergenciesPage } from './emergencies.page';
import { EmergencyDetailPage } from './emergency-detail/emergency-detail.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EmergenciesPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [EmergenciesPage, EmergencyDetailPage]
})
export class EmergenciesPageModule {}
