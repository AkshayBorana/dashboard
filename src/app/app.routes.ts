import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./feature/dashboard/dashboard.routes').then(m => m.dashboardRoutes),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
