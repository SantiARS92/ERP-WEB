import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ClientsStore } from '../../core/state/clients.store';
import { buildClientPayload, clientToFormValue, createClientForm } from '../../shared/forms/client-form';

@Component({
  selector: 'app-edit-client',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-client.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditClient implements OnInit {
  private clientApi = inject(ClientApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private clientsStore = inject(ClientsStore);

  readonly form = createClientForm(inject(NonNullableFormBuilder));
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly identificador = signal<number | null>(null);

  private clientId: number | null = null;

  ngOnInit() {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.router.navigate(['/clientes']);
      return;
    }
    this.clientId = +idStr;
    this.loadClient();
  }

  private loadClient() {
    if (!this.clientId) return;
    this.clientApi.getClientById(this.clientId).subscribe({
      next: (client) => {
        this.form.setValue(clientToFormValue(client));
        this.identificador.set(client.identificador ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/clientes']);
      }
    });
  }

  onSubmit() {
    if (!this.clientId) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Nombre y teléfono son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: Omit<Client, 'id'> = buildClientPayload(this.form.getRawValue());

    this.clientApi.updateClient(this.clientId, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.clientsStore.refresh().subscribe();
          this.router.navigate(['/clientes']);
        },
        error: () => {
          this.errorMessage.set('No se pudo actualizar el cliente. Comprueba la conexión.');
        }
      });
  }

  cancel() {
    this.router.navigate(['/clientes']);
  }

  async deleteClient() {
    if (!this.clientId) return;

    const confirmed = await this.confirm.ask('¿Está seguro de eliminar permanentemente este cliente? Esta acción no se puede deshacer.', {
      title: 'Eliminar cliente',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    this.clientApi.deleteClient(this.clientId).subscribe({
      next: () => {
        this.clientsStore.refresh().subscribe();
        this.router.navigate(['/clientes']);
      },
      error: () => {
        this.notification.error('Ocurrió un error al eliminar el cliente.');
      }
    });
  }
}
