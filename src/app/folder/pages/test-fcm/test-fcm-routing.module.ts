import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TestFcmPage } from './test-fcm.page';

const routes: Routes = [
  {
    path: '',
    component: TestFcmPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TestFcmPageRoutingModule {}
