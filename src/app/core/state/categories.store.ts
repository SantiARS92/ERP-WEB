import { Injectable, inject } from '@angular/core';
import { CategoryApiService } from '../services/category-api.service';
import { createCatalogStore } from './catalog-store';

@Injectable({
  providedIn: 'root'
})
export class CategoriesStore {
  private categoryApi = inject(CategoryApiService);
  private readonly store = createCatalogStore(() => this.categoryApi.getCategories());

  readonly items = this.store.items;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;

  ensureLoaded() {
    return this.store.ensureLoaded();
  }

  refresh() {
    return this.store.refresh();
  }
}
