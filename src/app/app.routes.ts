import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/user.model';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login)
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'panel', pathMatch: 'full' },
      {
        path: 'panel',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.GUEST] }
      },
      {
        path: 'servicios',
        loadChildren: () => import('./pages/servicios.routes').then((m) => m.serviciosRoutes),
      },
      {
        path: 'clientes',
        loadChildren: () => import('./pages/clientes.routes').then((m) => m.clientesRoutes),
      },
      {
        path: 'agenda',
        loadChildren: () => import('./pages/agenda.routes').then((m) => m.agendaRoutes),
      },
      {
        path: 'ventas',
        loadChildren: () => import('./pages/ventas.routes').then((m) => m.ventasRoutes),
      },
      {
        path: 'gastos',
        loadChildren: () => import('./pages/gastos.routes').then((m) => m.gastosRoutes),
      },
      {
        path: 'inventario',
        loadChildren: () => import('./pages/inventario.routes').then((m) => m.inventarioRoutes),
      },
      {
        path: 'informes',
        loadChildren: () => import('./pages/informes.routes').then((m) => m.informesRoutes),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuracion/configuracion').then((m) => m.Configuracion),
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
    ]
  },
  {
    path: '**',
    redirectTo: 'panel'
  }
];
