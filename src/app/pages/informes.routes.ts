import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const informesRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN] },
    children: [
      {
        path: '',
        loadComponent: () => import('./informes/informes-directorio/informes-directorio').then((m) => m.InformesDirectorio),
      },
      {
        path: 'mensual-simple',
        loadComponent: () => import('./informes/mensual-simple/mensual-simple').then((m) => m.InformeMensualSimple),
      },
      {
        path: 'mensual-detallado',
        loadComponent: () => import('./informes/mensual-detallado/mensual-detallado').then((m) => m.InformeMensualDetallado),
      },
      {
        path: 'trimestral',
        loadComponent: () => import('./informes/trimestral/trimestral').then((m) => m.InformeTrimestral),
      },
      {
        path: 'anual',
        loadComponent: () => import('./informes/anual/anual').then((m) => m.InformeAnual),
      },
      {
        path: 'ranking-servicios',
        loadComponent: () => import('./informes/ranking-servicios/ranking-servicios').then((m) => m.InformeRankingServicios),
      },
    ],
  },
];
