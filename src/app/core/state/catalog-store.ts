import { Signal, signal } from '@angular/core';
import { Observable, of, shareReplay, tap, catchError, finalize } from 'rxjs';

export interface CatalogStore<T> {
  items: Signal<T[]>;
  isLoading: Signal<boolean>;
  error: Signal<unknown | null>;
  ensureLoaded(): Observable<T[]>;
  refresh(): Observable<T[]>;
}

export function createCatalogStore<T>(fetcher: () => Observable<T[]>): CatalogStore<T> {
  const itemsSignal = signal<T[]>([]);
  const isLoadingSignal = signal(false);
  const errorSignal = signal<unknown | null>(null);
  let hasLoaded = false;
  let inFlight$: Observable<T[]> | null = null;

  const load = (force: boolean): Observable<T[]> => {
    if (!force && hasLoaded) {
      return of(itemsSignal());
    }

    if (inFlight$) {
      return inFlight$;
    }

    isLoadingSignal.set(true);
    errorSignal.set(null);

    const request$ = fetcher().pipe(
      tap((items) => {
        itemsSignal.set(items);
        hasLoaded = true;
      }),
      catchError((error) => {
        errorSignal.set(error);
        return of(itemsSignal());
      }),
      finalize(() => {
        isLoadingSignal.set(false);
        inFlight$ = null;
      }),
      shareReplay(1),
    );

    inFlight$ = request$;

    return request$;
  };

  return {
    items: itemsSignal.asReadonly(),
    isLoading: isLoadingSignal.asReadonly(),
    error: errorSignal.asReadonly(),
    ensureLoaded: () => load(false),
    refresh: () => {
      hasLoaded = false;
      return load(true);
    },
  };
}
