import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ServiceApiService, ServiceFilters } from '../../core/services/service-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { createPagedResource } from '../../core/state/paged-resource';

@Component({
  selector: 'app-services',
  imports: [CurrencyPipe, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './services.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Services {
  readonly pageSize = 10;
  readonly isFilterOpen = signal(false);
  readonly searchText = signal('');
  readonly statusFilter = signal('Todos los estados');
  readonly selectedCategories = signal<number[]>([]);
  readonly categoriesError = signal(false);

  private serviceApi = inject(ServiceApiService);
  private categoryApi = inject(CategoryApiService);
  private readonly resource = createPagedResource<import('../../core/models/service.model').Service, ServiceFilters & { page: number; size: number }>({
    initialFilters: { search: '', active: undefined, categoryId: undefined, page: 0, size: this.pageSize },
    fetcher: (filters) => this.serviceApi.getServices(filters),
  });

  readonly categories = toSignal(
    this.categoryApi.getCategories().pipe(
      catchError(() => {
        this.categoriesError.set(true);
        return of([]);
      })
    ),
    { initialValue: [] }
  );
  readonly services = this.resource.items;
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

  toggleFilter() {
    this.isFilterOpen.update((value) => !value);
  }

  clearFilters() {
    this.searchText.set('');
    this.statusFilter.set('Todos los estados');
    this.selectedCategories.set([]);
    this.resource.setFilters({ search: '', active: undefined, categoryId: undefined, page: 0 });
  }

  toggleCategoryFilter(categoryId: number) {
    this.selectedCategories.update((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }

  applyFilters() {
    this.resource.setFilters({
      page: 0,
      active: this.statusFilter() === 'Activo' ? true : this.statusFilter() === 'Inactivo' ? false : undefined,
      categoryId: this.selectedCategories()[0],
    });
    this.isFilterOpen.set(false);
  }

  reload() {
    this.resource.reload();
  }
}
