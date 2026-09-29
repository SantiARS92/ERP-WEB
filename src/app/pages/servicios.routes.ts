import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const serviciosRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] },
    children: [
      {
        path: '',
        loadComponent: () => import('./services/services').then((m) => m.Services),
      },
      {
        path: 'crear',
        loadComponent: () => import('./create-service/create-service').then((m) => m.CreateService),
      },
      {
        path: 'editar/:id',
        loadComponent: () => import('./edit-service/edit-service').then((m) => m.EditService),
      },
     
    ],
  },
];
