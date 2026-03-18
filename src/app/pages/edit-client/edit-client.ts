import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-edit-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-client.html',
})
export class EditClient implements OnInit {
  client: Omit<Client, 'id'> = {
    fullName: '',
    phone: '',
    email: ''
  };
  clientId: number | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage: string | null = null;

  private clientApi = inject(ClientApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

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
          email: client.email ?? ''
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading client', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/clientes']);
      }
    });
  }

  onSubmit() {
    console.log('🚀 Update triggered', this.client);
    if (!this.client.fullName.trim() || !this.clientId) {
      console.warn('⚠️ Validation failed: name and ID are required');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    // Safety fallback
    const safetyTimer = setTimeout(() => {
      if (this.isSubmitting) {
        console.error('🛑 Safety timer triggered');
        this.isSubmitting = false;
        this.errorMessage = 'El servidor no responde. Revisa el backend.';
        this.cdr.detectChanges();
      }
    }, 15000);

    const payload: Omit<Client, 'id'> = {
      fullName: this.client.fullName.trim(),
      phone: this.client.phone.trim(),
      email: this.client.email?.trim() || null
    };

    console.log('📡 Sending PUT to /api/clients/' + this.clientId, payload);

    this.clientApi.updateClient(this.clientId, payload)
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
          console.log('✅ Client updated successfully:', res);
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          console.error('❌ Detailed error updating client:', err);
          this.errorMessage = 'No se pudo actualizar el cliente. Comprueba la conexión.';
          this.cdr.detectChanges();
        }
      });
  }

  cancel() {
    this.router.navigate(['/clientes']);
  }
}
