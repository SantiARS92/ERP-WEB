import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { Login } from './pages/login/login';
import { authGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/user.model';
import { Services } from './pages/services/services';
import { EditService } from './pages/edit-service/edit-service';
import { ManageCategories } from './pages/manage-categories/manage-categories';
import { CreateService } from './pages/create-service/create-service';
import { Clients } from './pages/clients/clients';
import { CreateClient } from './pages/create-client/create-client';
import { EditClient } from './pages/edit-client/edit-client';
import { Agenda } from './pages/agenda/agenda';
import { CreateAppointment } from './pages/create-appointment/create-appointment';
import { Sales } from './pages/sales/sales';
import { EditSale } from './pages/edit-sale/edit-sale';
import { Gastos } from './pages/gastos/gastos';
import { EditGasto } from './pages/edit-gasto/edit-gasto';
import { Inventory } from './pages/inventory/inventory';
import { EditProduct } from './pages/edit-product/edit-product';
import { Configuracion } from './pages/configuracion/configuracion';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'panel', pathMatch: 'full' },
      { 
        path: 'panel', 
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.GUEST] }
      },
      { 
        path: 'servicios', 
        component: Services,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
      { path: 'servicios/crear', component: CreateService, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { path: 'servicios/editar/:id', component: EditService, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { path: 'servicios/categorias', component: ManageCategories, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { 
        path: 'clientes', 
        component: Clients,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
      { path: 'clientes/crear', component: CreateClient, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { path: 'clientes/editar/:id', component: EditClient, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { 
        path: 'agenda', 
        component: Agenda,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.GUEST] }
      },
      { path: 'agenda/crear', component: CreateAppointment, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.GUEST] } },
      { 
        path: 'ventas', 
        component: Sales,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
      { path: 'ventas/crear', loadComponent: () => import('./pages/create-sale/create-sale').then(m => m.CreateSale), data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { path: 'ventas/editar/:id', component: EditSale, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { 
        path: 'gastos', 
        component: Gastos,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
      { path: 'gastos/crear', loadComponent: () => import('./pages/create-gasto/create-gasto').then(m => m.CreateGasto), data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { path: 'gastos/editar/:id', component: EditGasto, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { 
        path: 'inventario', 
        component: Inventory,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
      { path: 'inventario/nuevo', component: EditProduct, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { path: 'inventario/editar/:id', component: EditProduct, data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] } },
      { 
        path: 'informes', 
        loadComponent: () => import('./pages/informes/informes-directorio/informes-directorio').then(m => m.InformesDirectorio),
        data: { roles: [UserRole.ADMIN] }
      },
      { path: 'informes/mensual-simple', loadComponent: () => import('./pages/informes/mensual-simple/mensual-simple').then(m => m.InformeMensualSimple), data: { roles: [UserRole.ADMIN] } },
      { path: 'informes/mensual-detallado', loadComponent: () => import('./pages/informes/mensual-detallado/mensual-detallado').then(m => m.InformeMensualDetallado), data: { roles: [UserRole.ADMIN] } },
      { path: 'informes/trimestral', loadComponent: () => import('./pages/informes/trimestral/trimestral').then(m => m.InformeTrimestral), data: { roles: [UserRole.ADMIN] } },
      { path: 'informes/anual', loadComponent: () => import('./pages/informes/anual/anual').then(m => m.InformeAnual), data: { roles: [UserRole.ADMIN] } },
      { path: 'informes/ranking-servicios', loadComponent: () => import('./pages/informes/ranking-servicios/ranking-servicios').then(m => m.InformeRankingServicios), data: { roles: [UserRole.ADMIN] } },
      { 
        path: 'configuracion', 
        component: Configuracion,
        data: { roles: [UserRole.ADMIN, UserRole.PROFESSIONAL] }
      },
    ]
  },
  {
    path: '**',
    redirectTo: 'panel'
  }
];
