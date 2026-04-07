import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnalyticsPage } from './analytics.page';
import { HeatmapPage } from './heatmap/heatmap.page';

const routes: Routes = [
  {
    path: '',
    component: AnalyticsPage
  },
  {
    path: 'heatmap',
    component: HeatmapPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalyticsPageRoutingModule {}

