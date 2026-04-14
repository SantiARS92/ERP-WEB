import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Service } from '../../core/models/service.model';
import { Category } from '../../core/models/category.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './services.html',
  styles: ``,
})
export class Services implements OnInit {
  isFilterOpen = false;
  services: Service[] = [];
  
  // Pagination & Filter state
  searchText = '';
  statusFilter = 'Todos los estados';
  selectedCategories: number[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  categories: Category[] = [];

  private serviceApi = inject(ServiceApiService);
  private categoryApi = inject(CategoryApiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadCategories();
    this.loadServices();
  }

  loadCategories() {
    this.categoryApi.getCategories().subscribe(cats => {
      this.categories = cats;
      this.cdr.detectChanges();
    });
  }

  loadServices() {
    const filters: any = {};
    
    // Only send filters if they have values to avoid backend issues
    if (this.searchText.trim()) filters.search = this.searchText.trim();
    if (this.statusFilter === 'Activo') filters.active = true;
    if (this.statusFilter === 'Inactivo') filters.active = false;
    if (this.selectedCategories.length > 0) filters.categoryId = this.selectedCategories[0];
    
    // Always send pagination
    filters.page = this.currentPage;
    filters.size = this.pageSize;

    this.serviceApi.getServices(filters).subscribe({
      next: (data: any) => {
        console.log('Servicios recibidos:', data);
        
        // Robust handling of different API response formats
        if (data && typeof data === 'object') {
          if (Array.isArray(data.content)) {
            this.services = data.content;
            this.totalElements = data.totalElements ?? data.content.length;
            this.totalPages = data.totalPages ?? Math.ceil(this.totalElements / this.pageSize);
          } else if (Array.isArray(data)) {
            this.services = data;
            this.totalElements = data.length;
            this.totalPages = Math.ceil(data.length / this.pageSize);
          } else {
            console.warn('Estructura de datos inesperada:', data);
            this.services = [];
            this.totalElements = 0;
            this.totalPages = 0;
          }
        } else {
          this.services = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching services', err);
        // Error handling for CORS or connection issues
        const errorMsg = err.status === 0 
          ? 'No se pudo conectar con el servidor (CORS o Red). Verifique que la API esté encendida.'
          : `Error al cargar servicios (${err.status}): ${err.message}`;
        alert(errorMsg);
      }
    });
  }

  // Helper for pagination array
  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  onSearch() {
    this.currentPage = 0;
    this.loadServices();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.loadServices();
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = 'Todos los estados';
    this.selectedCategories = [];
    this.currentPage = 0;
    this.loadServices();
  }

  toggleCategoryFilter(categoryId: number) {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index === -1) {
      this.selectedCategories.push(categoryId);
    } else {
      this.selectedCategories.splice(index, 1);
    }
    this.currentPage = 0;
    this.loadServices();
  }

  get filteredServices(): Service[] {
    return this.services;
  }
}
