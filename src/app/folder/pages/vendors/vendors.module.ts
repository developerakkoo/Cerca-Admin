import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VendorsPageRoutingModule } from './vendors-routing.module';

import { VendorsPage } from './vendors.page';
import { VendorDetailPage } from './vendor-detail/vendor-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VendorsPageRoutingModule
  ],
  declarations: [VendorsPage, VendorDetailPage]
})
export class VendorsPageModule {}
