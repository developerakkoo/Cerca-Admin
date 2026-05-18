import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { FolderPageRoutingModule } from './folder-routing.module';

import { FolderPage } from './folder.page';
import { AdminNotificationsToolbarButtonComponent } from '../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonicModule,
    FolderPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [FolderPage]
})
export class FolderPageModule {}
