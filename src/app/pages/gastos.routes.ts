import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const gastosRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] },
    children: [
      {
        path: '',
        loadComponent: () => import('./gastos/gastos').then((m) => m.Gastos),
      },
      {
        path: 'crear',
        loadComponent: () => import('./create-gasto/create-gasto').then((m) => m.CreateGasto),
      },
      {
        path: 'editar/:id',
        loadComponent: () => import('./edit-gasto/edit-gasto').then((m) => m.EditGasto),
      },
    ],
  },
];
