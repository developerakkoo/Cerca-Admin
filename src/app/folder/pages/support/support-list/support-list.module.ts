import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { SupportListPageRoutingModule } from './support-list-routing.module';

import { SupportListPage } from './support-list.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonicModule,
    SupportListPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [SupportListPage]
})
export class SupportListPageModule {}
