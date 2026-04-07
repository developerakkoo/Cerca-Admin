import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EmergenciesPage } from './emergencies.page';
import { EmergencyDetailPage } from './emergency-detail/emergency-detail.page';

const routes: Routes = [
  {
    path: '',
    component: EmergenciesPage
  },
  {
    path: ':id',
    component: EmergencyDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmergenciesPageRoutingModule {}
