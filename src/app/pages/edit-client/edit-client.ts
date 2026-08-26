import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ClientsStore } from '../../core/state/clients.store';

@Component({
  selector: 'app-edit-client',
  imports: [FormsModule, RouterLink],
  templateUrl: './edit-client.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditClient implements OnInit {
  private readonly clientSignal = signal<Omit<Client, 'id'>>({
    fullName: '',
    phone: '',
    email: '',
    admiteFacturas: false,
    direccion: '',
    cifNif: '',
    identificador: null
  });
  clientId: number | null = null;
  private readonly isLoadingSignal = signal(true);
  private readonly isSubmittingSignal = signal(false);
  private readonly errorMessageSignal = signal<string | null>(null);

  private clientApi = inject(ClientApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private clientsStore = inject(ClientsStore);

  get client() { return this.clientSignal(); }
  set client(value: Omit<Client, 'id'>) { this.clientSignal.set(value); }

  get isLoading() { return this.isLoadingSignal(); }
  set isLoading(value: boolean) { this.isLoadingSignal.set(value); }

  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }

  get errorMessage() { return this.errorMessageSignal(); }
  set errorMessage(value: string | null) { this.errorMessageSignal.set(value); }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.clientId = +idStr;
        this.loadClient();
      } else {
        this.router.navigate(['/clientes']);
      }
    });
  }

  loadClient() {
    if (!this.clientId) return;
    this.clientApi.getClientById(this.clientId).subscribe({
      next: (client) => {
        this.client = {
          fullName: client.fullName,
          phone: client.phone,
          email: client.email ?? '',
          admiteFacturas: client.admiteFacturas ?? false,
          direccion: client.direccion ?? '',
          cifNif: client.cifNif ?? '',
          identificador: client.identificador ?? null
        };
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/clientes']);
      }
    });
  }

  onSubmit() {
    if (!this.client.fullName.trim() || !this.client.phone.trim() || !this.clientId) {
      this.notification.warning('Nombre y teléfono son obligatorios.');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    // Safety fallback
    const safetyTimer = setTimeout(() => {
      if (this.isSubmitting) {
        this.isSubmitting = false;
        this.errorMessage = 'El servidor no responde. Revisa el backend.';
      }
    }, 15000);

    const payload: Omit<Client, 'id'> = {
      fullName: this.client.fullName.trim(),
      phone: this.client.phone.trim(),
      email: this.client.email?.trim() || null,
      admiteFacturas: this.client.admiteFacturas ?? false,
      direccion: this.client.admiteFacturas ? (this.client.direccion?.trim() || null) : null,
      cifNif: this.client.admiteFacturas ? (this.client.cifNif?.trim() || null) : null
    };

    this.clientApi.updateClient(this.clientId, payload)
      .pipe(
        finalize(() => {
          clearTimeout(safetyTimer);
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.clientsStore.refresh().subscribe();
          this.router.navigate(['/clientes']);
        },
        error: () => {
          this.errorMessage = 'No se pudo actualizar el cliente. Comprueba la conexión.';
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

    if (!confirmed) {
      return;
    }

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
