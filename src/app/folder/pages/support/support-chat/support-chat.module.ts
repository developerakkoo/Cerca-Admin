import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { SupportChatPageRoutingModule } from './support-chat-routing.module';

import { SupportChatPage } from './support-chat.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonicModule,
    SupportChatPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [SupportChatPage]
})
export class SupportChatPageModule {}
