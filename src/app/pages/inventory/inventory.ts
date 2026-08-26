import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { from, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { createPagedResource } from '../../core/state/paged-resource';

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './inventory.html',
  styles: ``,
})
export class Inventory {
  private productApi = inject(ProductApiService);
  private categoryApi = inject(CategoryApiService);
  readonly pageSize = 10;
  readonly searchText = signal('');
  readonly selectedCategoryIds = signal<number[]>([]);
  readonly isFilterOpen = signal(false);
  readonly expandedIds = signal<Set<number>>(new Set());
  private readonly variantDetails = signal<Record<number, InventoryVariant[]>>({});
  private readonly loadingVariantIds = signal<Set<number>>(new Set());
  private readonly resource = createPagedResource({
    initialFilters: { search: '', categoryIds: undefined as string | undefined, page: 0, size: this.pageSize },
    fetcher: (filters) => this.productApi.getProducts(filters),
  });

  readonly categories = toSignal(this.categoryApi.getCategories().pipe(catchError(() => of([]))), { initialValue: [] });
  readonly totalElements = this.resource.totalElements;
  readonly currentPage = this.resource.page;
  readonly isLoading = this.resource.isLoading;
  readonly hasError = computed(() => this.resource.error() !== null);
  readonly products = computed(() => this.resource.items().map((product) => {
    if (!product.id) {
      return product;
    }

    const variants = this.variantDetails()[product.id];
    if (!variants) {
      return product;
    }

    return {
      ...product,
      variants,
      variantCount: variants.length,
    };
  }));

  constructor() {
    effect(() => {
      const products = this.resource.items();
      const variantMap = this.variantDetails();
      const loadingIds = this.loadingVariantIds();
      const pending = products.filter((product) => product.hasVariants && product.id !== undefined && !variantMap[product.id] && !loadingIds.has(product.id));
      if (!pending.length) {
        return;
      }

      this.loadingVariantIds.update((current) => new Set([...current, ...pending.map((product) => product.id!)]));
      this.preloadVariants(pending);
    });
  }

  // TODO(api): mitigación temporal del N+1 (plan §1.10). Resolución definitiva en §7.4:
  // que `GET /api/products` devuelva las variantes embebidas y se elimine este método.
  private preloadVariants(products: Product[]) {
    from(products).pipe(
      mergeMap(
        p => this.productApi.getProductById(p.id as number).pipe(catchError(() => of(p))),
        4
      ),
      toArray()
    ).subscribe({
      next: (fullProducts) => {
        this.variantDetails.update((current) => {
          const next = { ...current };
          for (const fullProduct of fullProducts) {
            if (fullProduct.id && fullProduct.variants) {
              next[fullProduct.id] = fullProduct.variants;
            }
          }
          return next;
        });
        this.loadingVariantIds.update((current) => {
          const next = new Set(current);
          for (const fullProduct of fullProducts) {
            if (fullProduct.id) {
              next.delete(fullProduct.id);
            }
          }
          return next;
        });
      }
    });
  }

  // ── Search & Filters ─────────────────────────────
  onSearch(searchText: string) {
    this.searchText.set(searchText);
    this.resource.setFilters({ search: searchText, page: 0 });
  }

  toggleFilter() {
    this.isFilterOpen.update((value) => !value);
  }

  toggleCategoryFilter(categoryId: number) {
    this.selectedCategoryIds.update((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }

  applyFilters() {
    const categoryIds = this.selectedCategoryIds();
    this.resource.setFilters({
      page: 0,
      categoryIds: categoryIds.length ? categoryIds.join(',') : undefined,
    });
    this.isFilterOpen.set(false);
  }

  clearFilters() {
    this.selectedCategoryIds.set([]);
    this.searchText.set('');
    this.resource.setFilters({ search: '', categoryIds: undefined, page: 0 });
    this.isFilterOpen.set(false);
  }

  changePage(p: number) {
    this.resource.setPage(p);
  }



  // ── Expand rows ───────────────────────────────────
  toggleExpand(id: number) {
    if (this.expandedIds().has(id)) {
      this.expandedIds.update((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } else {
      this.expandedIds.update((current) => new Set([...current, id]));
      
      // If expanding and variants are missing, fetch them
      const product = this.products().find((item) => item.id === id);
      if (product && product.hasVariants && (!product.variants || product.variants.length === 0)) {
        this.productApi.getProductById(id).subscribe({
          next: (fullProduct) => {
            if (fullProduct.variants) {
              this.variantDetails.update((current) => ({ ...current, [id]: fullProduct.variants! }));
            }
          },
          error: (err) => console.error('Error loading variants for expansion:', err)
        });
      }
    }
  }

  isExpanded(id: number) { return this.expandedIds().has(id); }

  // ── Status / Style helpers ────────────────────────
  getStatusClasses(status: string): string {
    switch (status) {
      case 'IN_STOCK':    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'LOW_STOCK':   return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'OUT_OF_STOCK':return 'bg-red-50 text-red-600 border-red-100';
      default:            return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  statusFromVariant(v: InventoryVariant): string {
    if (v.stock <= 0) return 'OUT_OF_STOCK';
    if (v.stock <= v.minimumStock) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  statusLabelFromVariant(v: InventoryVariant): string {
    if (v.stock <= 0) return 'Agotado';
    if (v.stock <= v.minimumStock) return 'Bajo stock';
    return 'En stock';
  }

  computedStatusLabel(p: Product): string {
    if (p.statusLabel) return p.statusLabel;
    if (p.status === 'IN_STOCK') return 'En stock';
    if (p.status === 'LOW_STOCK') return 'Bajo stock';
    return 'Agotado';
  }



  exportPdf() {
    const categoryIds = this.selectedCategoryIds();
    const categoryIdsStr = categoryIds.length > 0 ? categoryIds.join(',') : undefined;

    this.productApi.exportProductsToPdf({ search: this.searchText(), categoryIds: categoryIdsStr }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error exporting PDF:', err)
    });
  }

  reload() {
    this.resource.reload();
  }
}
