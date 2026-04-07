import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EmergenciesPageRoutingModule } from './emergencies-routing.module';

import { EmergenciesPage } from './emergencies.page';
import { EmergencyDetailPage } from './emergency-detail/emergency-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EmergenciesPageRoutingModule
  ],
  declarations: [EmergenciesPage, EmergencyDetailPage]
})
export class EmergenciesPageModule {}
