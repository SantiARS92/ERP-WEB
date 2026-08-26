import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientApiService } from '../../core/services/client-api.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { createPagedResource } from '../../core/state/paged-resource';

@Component({
  selector: 'app-clients',
  imports: [NgClass, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './clients.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clients {
  private clientApi = inject(ClientApiService);
  readonly pageSize = 10;
  readonly searchText = signal('');
  private readonly resource = createPagedResource({
    initialFilters: { search: '', page: 0, size: this.pageSize },
    fetcher: (filters) => this.clientApi.getClients(filters),
  });

  readonly clients = this.resource.items;
  readonly totalElements = this.resource.totalElements;
  readonly currentPage = this.resource.page;
  readonly isLoading = this.resource.isLoading;
  readonly hasError = computed(() => this.resource.error() !== null);

  onSearch(searchText: string) {
    this.searchText.set(searchText);
    this.resource.setFilters({ search: searchText, page: 0 });
  }

  changePage(page: number) {
    this.resource.setPage(page);
  }

  reload() {
    this.resource.reload();
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
