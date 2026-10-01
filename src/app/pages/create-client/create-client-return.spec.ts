import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CreateClient } from './create-client';
import { CreateAppointment } from '../create-appointment/create-appointment';
import { ClientApiService } from '../../core/services/client-api.service';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { Client } from '../../core/models/client.model';

@Component({ template: '' })
class ClientsListStub {}

describe('Crear cliente desde Nueva Cita', () => {
  let clients: Client[];
  let harness: RouterTestingHarness;
  let router: Router;

  const newClient = { id: 42, fullName: 'Cliente Nuevo', phone: '600000000' } as Client;

  beforeEach(async () => {
    sessionStorage.clear();
    clients = [{ id: 1, fullName: 'Ana', phone: '611111111' } as Client];

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'agenda/crear', component: CreateAppointment },
          { path: 'clientes/crear', component: CreateClient },
          { path: 'clientes', component: ClientsListStub },
          { path: 'agenda', component: ClientsListStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ClientApiService, useValue: { createClient: () => { clients = [...clients, newClient]; return of(newClient); } } },
        { provide: ClientsStore, useValue: { ensureLoaded: () => of(clients), refresh: () => of(clients) } },
        { provide: ServicesStore, useValue: { ensureLoaded: () => of([]) } },
        { provide: ProfessionalApiService, useValue: { getProfessionals: () => of([]) } },
      ],
    });

    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  function fillClientForm(component: CreateClient) {
    component.form.patchValue({ fullName: newClient.fullName, phone: newClient.phone });
  }

  it('vuelve a Nueva Cita con los datos conservados y el cliente nuevo seleccionado', async () => {
    const appointment = await harness.navigateByUrl('/agenda/crear', CreateAppointment);
    appointment.form.patchValue({ appointmentDate: '2026-10-15', serviceName: 'Corte', price: 20, internalNotes: 'Nota previa' });

    appointment.goToCreateClient();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/clientes/crear?returnUrl=%2Fagenda%2Fcrear');

    const createClient = harness.routeDebugElement!.componentInstance as CreateClient;
    fillClientForm(createClient);
    createClient.onSubmit();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/agenda/crear?newClientId=42');
    const restored = harness.routeDebugElement!.componentInstance as CreateAppointment;
    expect(restored).toBeInstanceOf(CreateAppointment);
    expect(restored.form.getRawValue()).toMatchObject({
      clientId: 42,
      clientName: 'Cliente Nuevo',
      appointmentDate: '2026-10-15',
      serviceName: 'Corte',
      price: 20,
      internalNotes: 'Nota previa',
    });
    expect(sessionStorage.getItem('appointmentDraft')).toBeNull();
  });

  it('al cancelar la creación del cliente vuelve a Nueva Cita', async () => {
    const appointment = await harness.navigateByUrl('/agenda/crear', CreateAppointment);
    appointment.form.patchValue({ internalNotes: 'Sin perder' });
    appointment.goToCreateClient();
    await harness.fixture.whenStable();

    (harness.routeDebugElement!.componentInstance as CreateClient).cancel();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/agenda/crear');
    const restored = harness.routeDebugElement!.componentInstance as CreateAppointment;
    expect(restored.form.controls.internalNotes.value).toBe('Sin perder');
  });

  it('desde Clientes (sin returnUrl) sigue volviendo a Clientes', async () => {
    const createClient = await harness.navigateByUrl('/clientes/crear', CreateClient);
    fillClientForm(createClient);
    createClient.onSubmit();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/clientes');
  });

  it('ignora returnUrl externos', async () => {
    const createClient = await harness.navigateByUrl('/clientes/crear?returnUrl=%2F%2Fevil.com', CreateClient);
    fillClientForm(createClient);
    createClient.onSubmit();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/clientes');
  });
});
