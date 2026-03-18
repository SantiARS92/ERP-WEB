import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { Services } from './pages/services/services';
import { EditService } from './pages/edit-service/edit-service';
import { ManageCategories } from './pages/manage-categories/manage-categories';
import { CreateService } from './pages/create-service/create-service';
import { Clients } from './pages/clients/clients';
import { CreateClient } from './pages/create-client/create-client';
import { EditClient } from './pages/edit-client/edit-client';
import { Agenda } from './pages/agenda/agenda';
import { CreateAppointment } from './pages/create-appointment/create-appointment';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', redirectTo: 'servicios', pathMatch: 'full' },
      { path: 'servicios', component: Services },
      { path: 'servicios/crear', component: CreateService },
      { path: 'servicios/editar/:id', component: EditService },
      { path: 'servicios/categorias', component: ManageCategories },
      { path: 'clientes', component: Clients },
      { path: 'clientes/crear', component: CreateClient },
      { path: 'clientes/editar/:id', component: EditClient },
      { path: 'agenda', component: Agenda },
      { path: 'agenda/crear', component: CreateAppointment }
    ]
  }
];
