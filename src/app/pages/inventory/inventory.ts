import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Product, ProductPage, InventoryVariant } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ─── Mock data shown when backend returns no products ─────────────────────────
const MOCK_PRODUCTS: Product[] = [
  {
    id: 1, name: 'Champú Kerastase', categoryId: 1, categoryName: 'Cabello',
    sku: 'CHA-001', stock: 42, minimumStock: 5,
    status: 'IN_STOCK', statusLabel: 'En stock',
    productType: 'SIMPLE', hasVariants: false, purchasePrice: 12.5,
    createdAt: '2024-01-10',
  },
  {
    id: 2, name: 'Camiseta Básica', categoryId: 2, categoryName: 'Ropa',
    sku: undefined, stock: 0, minimumStock: 5,
    status: 'OUT_OF_STOCK', statusLabel: 'Agotado',
    productType: 'VARIANT', hasVariants: true, purchasePrice: 0,
    createdAt: '2024-02-01',
    variants: [
      { id: 1, variantLabel: 'M / Verde', sku: 'CAM-M-VER', stock: 0, minimumStock: 2, purchasePrice: 8 },
      { id: 2, variantLabel: 'M / Rojo',  sku: 'CAM-M-ROJ', stock: 3, minimumStock: 2, purchasePrice: 8 },
      { id: 3, variantLabel: 'S / Verde', sku: 'CAM-S-VER', stock: 0, minimumStock: 2, purchasePrice: 8 },
      { id: 4, variantLabel: 'S / Rojo',  sku: 'CAM-S-ROJ', stock: 7, minimumStock: 2, purchasePrice: 8 },
    ]
  },
  {
    id: 3, name: 'Tornillo Galvanizado', categoryId: 3, categoryName: 'Ferretería',
    sku: undefined, stock: 0, minimumStock: 20,
    status: 'IN_STOCK', statusLabel: 'En stock',
    productType: 'VARIANT', hasVariants: true, purchasePrice: 0,
    createdAt: '2024-03-15',
    variants: [
      { id: 5, variantLabel: '4mm / 20mm', sku: 'TOR-200-4-20', stock: 150, minimumStock: 20, purchasePrice: 0.12 },
      { id: 6, variantLabel: '4mm / 30mm', sku: 'TOR-200-4-30', stock: 120, minimumStock: 20, purchasePrice: 0.15 },
      { id: 7, variantLabel: '6mm / 40mm', sku: 'TOR-200-6-40', stock: 50,  minimumStock: 20, purchasePrice: 0.18 },
      { id: 8, variantLabel: '6mm / 50mm', sku: 'TOR-200-6-50', stock: 0,   minimumStock: 20, purchasePrice: 0.20 },
    ]
  },
];
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-inventory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
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

    this.productApi.getProducts({
      search: this.searchText, categoryIds: categoryIdsStr,
      page: this.currentPage, size: this.pageSize
    }).subscribe({
      next: (data: ProductPage) => {
        // ── Use mock data when backend returns empty ─────────────────────────
        if (data.content.length === 0 && this.currentPage === 0 && !this.searchText) {
          this.products = [...MOCK_PRODUCTS];
          this.totalElements = MOCK_PRODUCTS.length;
          this.cdr.detectChanges();
        } else {
          this.products = data.content;
          this.totalElements = data.totalElements;
          this.cdr.detectChanges();
          // Pre-load variants so we have accurate counts and data for the list
          this.preloadVariants(data.content);
        }
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.products = [...MOCK_PRODUCTS];
        this.totalElements = MOCK_PRODUCTS.length;
        this.cdr.detectChanges();
      }
    });
  }

  private preloadVariants(products: Product[]) {
    const variantProducts = products.filter(p => p.hasVariants && p.id !== undefined);
    if (variantProducts.length === 0) return;

    const requests = variantProducts.map(p =>
      this.productApi.getProductById(p.id as number).pipe(catchError(() => of(p)))
    );

    forkJoin(requests).subscribe({
      next: (fullProducts) => {
        fullProducts.forEach(fp => {
          const target = this.products.find(p => p.id === fp.id);
          if (target) {
            target.variants = fp.variants;
            target.variantCount = fp.variants?.length ?? target.variantCount;
          }
        });
        this.cdr.detectChanges();
      },
      error: () => {} // Silent fail, we still have basic data
    });
  }

  // ── Search & Filters ─────────────────────────────
  onSearch() { this.currentPage = 0; this.loadProducts(); }
  toggleFilter() { this.isFilterOpen = !this.isFilterOpen; }

  toggleCategoryFilter(categoryId: number) {
    const index = this.selectedCategoryIds.indexOf(categoryId);
    index === -1 ? this.selectedCategoryIds.push(categoryId) : this.selectedCategoryIds.splice(index, 1);
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

  trackProduct(_: number, p: Product) { return p.id; }
  trackVariant(_: number, v: InventoryVariant) { return v.id ?? v.variantLabel; }
}
