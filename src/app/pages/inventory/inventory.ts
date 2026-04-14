import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Product, ProductPage } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './inventory.html',
  styles: ``,
})
export class Inventory implements OnInit {
  private productApi = inject(ProductApiService);
  private categoryApi = inject(CategoryApiService);
  private cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  categories: Category[] = [];
  
  searchText = '';
  selectedCategoryIds: number[] = [];
  
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;

  isFilterOpen = false;

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadCategories() {
    this.categoryApi.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading categories:', err)
    });
  }

  loadProducts() {
    const categoryIdsStr = this.selectedCategoryIds.length > 0 
      ? this.selectedCategoryIds.join(',') 
      : undefined;

    this.productApi.getProducts({
      search: this.searchText,
      categoryIds: categoryIdsStr,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (data: ProductPage) => {
        this.products = data.content;
        this.totalElements = data.totalElements;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading products:', err)
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadProducts();
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

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

  getStatusClasses(status: string): string {
    switch (status) {
      case 'IN_STOCK': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'LOW_STOCK': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'OUT_OF_STOCK': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  changePage(p: number) {
    this.currentPage = p;
    this.loadProducts();
  }

  exportPdf() {
    const categoryIdsStr = this.selectedCategoryIds.length > 0 
      ? this.selectedCategoryIds.join(',') 
      : undefined;

    this.productApi.exportProductsToPdf({
      search: this.searchText,
      categoryIds: categoryIdsStr
    }).subscribe({
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
