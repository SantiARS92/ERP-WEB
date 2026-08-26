import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const clientesRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] },
    children: [
      {
        path: '',
        loadComponent: () => import('./clients/clients').then((m) => m.Clients),
      },
      {
        path: 'crear',
        loadComponent: () => import('./create-client/create-client').then((m) => m.CreateClient),
      },
      {
        path: 'editar/:id',
        loadComponent: () => import('./edit-client/edit-client').then((m) => m.EditClient),
      },
    ],
  },
];
