import { WritableSignal, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { Page } from '../models/page.model';

interface ResourceState<T> {
  items: T[];
  totalElements: number;
  totalPages: number;
  isLoading: boolean;
  error: unknown;
}

interface PagedResourceOptions<T, F extends { page: number; size: number }> {
  initialFilters: F;
  fetcher: (filters: F) => Observable<Page<T>>;
  debounceMs?: number;
}

function sameFilters<F>(a: F, b: F): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createPagedResource<T, F extends { page: number; size: number }>({
  initialFilters,
  fetcher,
  debounceMs = 300,
}: PagedResourceOptions<T, F>) {
  const filters = signal(initialFilters);
  const refreshTick = signal(0);

  const state = toSignal(
    toObservable(computed(() => ({ filters: filters(), refreshTick: refreshTick() }))).pipe(
      debounceTime(debounceMs),
      distinctUntilChanged((prev, curr) => prev.refreshTick === curr.refreshTick && sameFilters(prev.filters, curr.filters)),
      switchMap(({ filters: currentFilters }) =>
        fetcher(currentFilters).pipe(
          map((page): ResourceState<T> => ({
            items: page.content,
            totalElements: page.totalElements,
            totalPages: page.totalPages,
            isLoading: false,
            error: null,
          })),
          startWith({
            items: [],
            totalElements: 0,
            totalPages: 0,
            isLoading: true,
            error: null,
          }),
          catchError((error) => of({
            items: [],
            totalElements: 0,
            totalPages: 0,
            isLoading: false,
            error,
          }))
        )
      )
    ),
    {
      initialValue: {
        items: [],
        totalElements: 0,
        totalPages: 0,
        isLoading: true,
        error: null,
      },
    }
  );

  return {
    filters: filters as WritableSignal<F>,
    items: computed(() => state().items),
    totalElements: computed(() => state().totalElements),
    totalPages: computed(() => state().totalPages),
    isLoading: computed(() => state().isLoading),
    error: computed(() => state().error),
    page: computed(() => filters().page),
    pageSize: computed(() => filters().size),
    setPage(page: number) {
      filters.update((current) => ({ ...current, page }));
    },
    setFilters(updater: Partial<F> | ((current: F) => F)) {
      if (typeof updater === 'function') {
        filters.set(updater(filters()));
        return;
      }

      filters.update((current) => ({ ...current, ...updater }));
    },
    reload() {
      refreshTick.update((value) => value + 1);
    },
  };
}
