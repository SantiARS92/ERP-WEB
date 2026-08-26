import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ClientApiService } from '../services/client-api.service';
import { createCatalogStore } from './catalog-store';

@Injectable({
  providedIn: 'root'
})
export class ClientsStore {
  private clientApi = inject(ClientApiService);
  private readonly store = createCatalogStore(() => this.clientApi.getClients({ size: 1000 }).pipe(
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
