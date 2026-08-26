import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { UserRole } from '../core/models/user.model';

export const agendaRoutes: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.GUEST] },
    children: [
      {
        path: '',
        loadComponent: () => import('./agenda/agenda').then((m) => m.Agenda),
      },
      {
        path: 'crear',
        loadComponent: () => import('./create-appointment/create-appointment').then((m) => m.CreateAppointment),
      },
    ],
  },
];
