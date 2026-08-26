import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const ventasRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] },
    children: [
      {
        path: '',
        loadComponent: () => import('./sales/sales').then((m) => m.Sales),
      },
      {
        path: 'crear',
        loadComponent: () => import('./create-sale/create-sale').then((m) => m.CreateSale),
      },
      {
        path: 'editar/:id',
        loadComponent: () => import('./edit-sale/edit-sale').then((m) => m.EditSale),
      },
    ],
  },
];
