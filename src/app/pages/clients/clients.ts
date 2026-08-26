import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { Client } from '../../core/models/client.model';
import { finalize } from 'rxjs';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-clients',
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
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

    this.clientApi.getClients(filters).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object') {
          if (Array.isArray(data.content)) {
            this.clients = data.content;
            this.totalElements = data.totalElements ?? data.content.length;
            this.totalPages = data.totalPages ?? Math.ceil(this.totalElements / this.pageSize);
          } else if (Array.isArray(data)) {
            this.clients = data;
            this.totalElements = data.length;
            this.totalPages = Math.ceil(data.length / this.pageSize);
          }
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching clients:', err);
        this.clients = [];
        this.isLoading = false;
        this.cdr.detectChanges();
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
