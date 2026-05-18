import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AnalyticsPageRoutingModule } from './analytics-routing.module';
import { AnalyticsPage } from './analytics.page';
import { HeatmapPage } from './heatmap/heatmap.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnalyticsPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [AnalyticsPage, HeatmapPage]
})
export class AnalyticsPageModule {}

