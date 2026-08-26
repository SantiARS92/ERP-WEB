import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Product, ProductPage, InventoryVariant } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { from, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [NgClass, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './inventory.html',
  styles: ``,
})
export class Inventory implements OnInit {
  private productApi   = inject(ProductApiService);
  private categoryApi  = inject(CategoryApiService);
  private cdr          = inject(ChangeDetectorRef);
  private router       = inject(Router);

  products: Product[]  = [];
  categories: Category[] = [];

  searchText = '';
  selectedCategoryIds: number[] = [];

  currentPage   = 0;
  pageSize      = 10;
  totalElements = 0;

  isFilterOpen = false;
  isLoading = false;
  hasError = false;

  // ── Expand/collapse variant rows ─────────────────
  expandedIds = new Set<number>();

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  // ── Data loading ──────────────────────────────────
  loadCategories() {
    this.categoryApi.getCategories().subscribe({
      next: (data) => { this.categories = data; this.cdr.detectChanges(); },
      error: (err) => console.error('Error loading categories:', err),
    });
  }

  loadProducts() {
    const categoryIdsStr = this.selectedCategoryIds.length > 0
      ? this.selectedCategoryIds.join(',') : undefined;

    this.isLoading = true;
    this.hasError = false;

    this.productApi.getProducts({
      search: this.searchText, categoryIds: categoryIdsStr,
      page: this.currentPage, size: this.pageSize
    }).subscribe({
      next: (data: ProductPage) => {
        // Una lista vacía es un resultado legítimo, no un error.
        this.products = data.content;
        this.totalElements = data.totalElements;
        this.isLoading = false;
        this.cdr.detectChanges();
        // Pre-load variants so we have accurate counts and data for the list
        this.preloadVariants(data.content);
      },
      error: () => {
        this.products = [];
        this.totalElements = 0;
        this.isLoading = false;
        this.hasError = true;
        this.cdr.detectChanges();
      }
    });
  }

  // TODO(api): mitigación temporal del N+1 (plan §1.10). Resolución definitiva en §7.4:
  // que `GET /api/products` devuelva las variantes embebidas y se elimine este método.
  private preloadVariants(products: Product[]) {
    const variantProducts = products.filter(p => p.hasVariants && p.id !== undefined);
    if (variantProducts.length === 0) return;

    from(variantProducts).pipe(
      mergeMap(
        p => this.productApi.getProductById(p.id as number).pipe(catchError(() => of(p))),
        4
      ),
      toArray()
    ).subscribe({
      next: (fullProducts) => {
        fullProducts.forEach(fp => {
          const target = this.products.find(p => p.id === fp.id);
          if (target) {
            target.variants = fp.variants;
            target.variantCount = fp.variants?.length ?? target.variantCount;
          }
        });
        this.cdr.detectChanges();
      }
    });
  }

  // ── Search & Filters ─────────────────────────────
  onSearch() { this.currentPage = 0; this.loadProducts(); }
  toggleFilter() { this.isFilterOpen = !this.isFilterOpen; }

  toggleCategoryFilter(categoryId: number) {
    const index = this.selectedCategoryIds.indexOf(categoryId);
    if (index === -1) {
      this.selectedCategoryIds.push(categoryId);
    } else {
      this.selectedCategoryIds.splice(index, 1);
    }
  }

  applyFilters() {
    this.currentPage = 0;
    this.loadProducts();
    this.isFilterOpen = false;
  }

  clearFilters() {
    this.selectedCategoryIds = [];
    this.searchText = '';
    this.currentPage = 0;
    this.applyFilters();
  }

  changePage(p: number) { this.currentPage = p; this.loadProducts(); }



  // ── Expand rows ───────────────────────────────────
  toggleExpand(id: number) {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
      
      // If expanding and variants are missing, fetch them
      const product = this.products.find(p => p.id === id);
      if (product && product.hasVariants && (!product.variants || product.variants.length === 0)) {
        this.productApi.getProductById(id).subscribe({
          next: (fullProduct) => {
            product.variants = fullProduct.variants;
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Error loading variants for expansion:', err)
        });
      }
    }
  }

  isExpanded(id: number) { return this.expandedIds.has(id); }

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
    const categoryIdsStr = this.selectedCategoryIds.length > 0
      ? this.selectedCategoryIds.join(',') : undefined;

    this.productApi.exportProductsToPdf({ search: this.searchText, categoryIds: categoryIdsStr }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error exporting PDF:', err)
    });
  }
}
