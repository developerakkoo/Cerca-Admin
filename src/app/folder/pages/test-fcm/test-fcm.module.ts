import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TestFcmPageRoutingModule } from './test-fcm-routing.module';
import { TestFcmPage } from './test-fcm.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TestFcmPageRoutingModule,
  ],
  declarations: [TestFcmPage],
})
export class TestFcmPageModule {}
