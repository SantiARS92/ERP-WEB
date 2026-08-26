import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { ClientsStore } from '../../core/state/clients.store';
import { buildClientPayload, createClientForm } from '../../shared/forms/client-form';

@Component({
  selector: 'app-create-client',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-client.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateClient {
  private clientApi = inject(ClientApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private clientsStore = inject(ClientsStore);

  readonly form = createClientForm(inject(NonNullableFormBuilder));
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Nombre y teléfono son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: Omit<Client, 'id'> = buildClientPayload(this.form.getRawValue());

    this.clientApi.createClient(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.clientsStore.refresh().subscribe();
          this.router.navigate(['/clientes']);
        },
        error: () => {
          this.errorMessage.set('No se pudo guardar el cliente. Revisa la conexión con el backend o los datos introducidos.');
        }
      });
  }

  cancel() {
    this.router.navigate(['/clientes']);
  }
}
