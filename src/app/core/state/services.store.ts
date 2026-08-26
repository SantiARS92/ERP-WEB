import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ServiceApiService } from '../services/service-api.service';
import { createCatalogStore } from './catalog-store';

@Injectable({
  providedIn: 'root'
})
export class ServicesStore {
  private serviceApi = inject(ServiceApiService);
  private readonly store = createCatalogStore(() => this.serviceApi.getServices({ size: 1000 }).pipe(
    map((page) => page.content ?? []),
  ));

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
