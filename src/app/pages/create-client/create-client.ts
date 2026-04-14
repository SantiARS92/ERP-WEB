import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-client.html',
})
export class CreateClient {
  client: Omit<Client, 'id'> = {
    fullName: '',
    phone: '',
    email: ''
  };
  isSubmitting = false;
  errorMessage: string | null = null;

  private clientApi = inject(ClientApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  onSubmit() {
    console.log('🚀 Submit triggered', this.client);
    if (!this.client.fullName.trim() || !this.client.phone.trim()) {
      console.warn('⚠️ Validation failed: name and phone are required');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    // Safety fallback: ensure spinner stops after 15s no matter what
    const safetyTimer = setTimeout(() => {
      if (this.isSubmitting) {
        console.error('🛑 Safety timer triggered: request is taking too long');
        this.isSubmitting = false;
        this.errorMessage = 'El servidor está tardando demasiado en responder. Revisa la consola (F12) o el estado del backend.';
        this.cdr.detectChanges();
      }
    }, 15000);

    const payload: Omit<Client, 'id'> = {
      fullName: this.client.fullName.trim(),
      phone: this.client.phone.trim(),
      email: this.client.email?.trim() || null
    };

    console.log('📡 Sending POST to /api/clients', payload);

    this.clientApi.createClient(payload)
      .pipe(
        finalize(() => {
          console.log('🏁 Request finalized');
          clearTimeout(safetyTimer);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          console.log('✅ Client created successfully:', res);
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          console.error('❌ Detailed error creating client:', err);
          this.errorMessage = 'No se pudo guardar el cliente. Revisa si el backend (8091) tiene habilitado CORS o si los datos son válidos.';
          this.cdr.detectChanges();
        }
      });
  }

  cancel() {
    this.router.navigate(['/clientes']);
  }
}
