import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';

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
      error: (err) => {
        console.error('Error loading client', err);
        this.isLoading = false;
        this.router.navigate(['/clientes']);
      }
    });
  }

  onSubmit() {
    console.log('🚀 Update triggered', this.client);
    if (!this.client.fullName.trim() || !this.client.phone.trim() || !this.clientId) {
      console.warn('⚠️ Validation failed: name, phone and ID are required');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    // Safety fallback
    const safetyTimer = setTimeout(() => {
      if (this.isSubmitting) {
        console.error('🛑 Safety timer triggered');
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

    console.log('📡 Sending PUT to /api/clients/' + this.clientId, payload);

    this.clientApi.updateClient(this.clientId, payload)
      .pipe(
        finalize(() => {
          console.log('🏁 Request finalized');
          clearTimeout(safetyTimer);
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (res) => {
          console.log('✅ Client updated successfully:', res);
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          console.error('❌ Detailed error updating client:', err);
          this.errorMessage = 'No se pudo actualizar el cliente. Comprueba la conexión.';
        }
      });
  }

  cancel() {
    this.router.navigate(['/clientes']);
  }

  deleteClient() {
    if (!this.clientId) return;
    if (confirm('¿Está seguro de eliminar permanentemente este cliente? Esta acción no se puede deshacer.')) {
      this.clientApi.deleteClient(this.clientId).subscribe({
        next: () => {
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          console.error('Error deleting client', err);
          alert('Ocurrió un error al eliminar el cliente.');
        }
      });
    }
  }
}
