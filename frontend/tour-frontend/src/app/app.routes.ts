import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'visualize' },
  {
    path: 'visualize',
    // lazy-load your page component
    loadComponent: () =>
      import('./pages/main-page/main-page').then((m) => m.MainPage /* or MainPageComponent */),
  },
  { path: '**', redirectTo: 'visualize' },
];
