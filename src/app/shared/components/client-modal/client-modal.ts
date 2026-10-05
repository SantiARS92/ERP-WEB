import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ClientApiService } from '../../../core/services/client-api.service';
import { Client } from '../../../core/models/client.model';
import { NotificationService } from '../../../core/services/notification.service';
import { ClientsStore } from '../../../core/state/clients.store';
import { buildClientPayload, createClientForm } from '../../forms/client-form';

/** Modal para dar de alta un cliente sin salir de la pantalla actual (p. ej. Nueva Cita). */
@Component({
  selector: 'app-client-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './client-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientModal {
  private clientApi = inject(ClientApiService);
  private notification = inject(NotificationService);
  private clientsStore = inject(ClientsStore);

  readonly saved = output<Client>();
  readonly closed = output<void>();

  readonly form = createClientForm(inject(NonNullableFormBuilder));
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Nombre y teléfono son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.clientApi.createClient(buildClientPayload(this.form.getRawValue()))
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (client) => {
          this.clientsStore.refresh().subscribe();
          this.saved.emit(client);
        },
        error: () => {
          this.errorMessage.set('No se pudo guardar el cliente. Revisa la conexión con el backend o los datos introducidos.');
        }
      });
  }
}
