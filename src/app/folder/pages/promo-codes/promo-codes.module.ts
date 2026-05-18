import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PromoCodesPageRoutingModule } from './promo-codes-routing.module';
import { PromoCodesPage } from './promo-codes.page';
import { AdminNotificationsToolbarButtonComponent } from '../../../components/admin-notifications-toolbar-button/admin-notifications-toolbar-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PromoCodesPageRoutingModule,
    AdminNotificationsToolbarButtonComponent,
  ],
  declarations: [PromoCodesPage]
})
export class PromoCodesPageModule {}

