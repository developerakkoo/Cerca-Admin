import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UsersPageRoutingModule } from './users-routing.module';
import { DigitsOnlyPhoneDirective } from '../../../shared/directives/digits-only-phone.directive';

import { UsersPage } from './users.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UsersPageRoutingModule,
    DigitsOnlyPhoneDirective,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [UsersPage]
})
export class UsersPageModule {}
