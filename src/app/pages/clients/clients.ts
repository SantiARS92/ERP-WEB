import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './clients.html',
})
export class Clients implements OnInit {
  clients: Client[] = [];

  // Pagination & Filter state
  searchText = '';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLoading = false;

  // Dropdown state tracked by row ID
  openDropdownId: number | null = null;

  // Delete Modal State
  isDeleteModalOpen = false;
  clientToDelete: Client | null = null;
  isDeleting = false;

  Math = Math;

  private clientApi = inject(ClientApiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients() {
    this.isLoading = true;
    const filters: { search?: string; page: number; size: number } = {
      page: this.currentPage,
      size: this.pageSize,
    };
    if (this.searchText.trim()) filters.search = this.searchText.trim();

    this.clientApi.getClients(filters)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.clients = data.content ?? [];
          this.totalElements = data.totalElements;
          this.totalPages = data.totalPages;
        },
        error: (err) => {
          console.error('Error fetching clients:', err);
          this.clients = [];
        }
      });
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  onSearch() {
    this.currentPage = 0;
    this.loadClients();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.loadClients();
  }

  toggleDropdown(clientId: number, event: Event) {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === clientId ? null : clientId;
  }

  closeDropdown() {
    this.openDropdownId = null;
  }

  openDeleteModal(client: Client, event: Event) {
    event.stopPropagation();
    this.clientToDelete = client;
    this.isDeleteModalOpen = true;
    this.closeDropdown();
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.clientToDelete = null;
  }

  confirmDelete() {
    if (!this.clientToDelete?.id) return;
    this.isDeleting = true;
    this.clientApi.deleteClient(this.clientToDelete.id)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.closeDeleteModal();
        })
      )
      .subscribe({
        next: () => {
          if (this.clients.length === 1 && this.currentPage > 0) {
            this.currentPage--;
          }
          this.loadClients();
        },
        error: (err) => {
          console.error('Error deleting client:', err);
          alert('Error al eliminar el cliente. Comprueba la conexión.');
        }
      });
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      'bg-red-100 text-red-600',
      'bg-orange-100 text-orange-600',
      'bg-amber-100 text-amber-600',
      'bg-green-100 text-green-600',
      'bg-emerald-100 text-emerald-600',
      'bg-teal-100 text-teal-600',
      'bg-cyan-100 text-cyan-600',
      'bg-blue-100 text-blue-600',
      'bg-indigo-100 text-indigo-600',
      'bg-violet-100 text-violet-600',
      'bg-purple-100 text-purple-600',
      'bg-fuchsia-100 text-fuchsia-600',
      'bg-rose-100 text-rose-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
