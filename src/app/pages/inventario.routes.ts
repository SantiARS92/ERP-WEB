import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const inventarioRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] },
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/inventory').then((m) => m.Inventory),
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./edit-product/edit-product').then((m) => m.EditProduct),
      },
      {
        path: 'editar/:id',
        loadComponent: () => import('./edit-product/edit-product').then((m) => m.EditProduct),
      },
    ],
  },
];
