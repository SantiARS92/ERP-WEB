import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const categoriasRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] },
    children: [
      {
        path: '',
        loadComponent: () => import('./manage-categories/manage-categories').then((m) => m.ManageCategories),
      },
    ],
  },
];
