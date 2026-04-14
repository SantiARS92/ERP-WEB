import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { SaleResponse, SaleRequest, SaleItemType, SaleSourceType, PaymentMethod } from '../../core/models/sale.model';
import { Service } from '../../core/models/service.model';
import { Product } from '../../core/models/product.model';
import { Client } from '../../core/models/client.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './sales.html',
  styles: ``,
})
export class Sales implements OnInit {
  private saleApi = inject(SaleApiService);
  private serviceApi = inject(ServiceApiService);
  private productApi = inject(ProductApiService);
  private clientApi = inject(ClientApiService);
  private cdr = inject(ChangeDetectorRef);

  viewMode: 'recent' | 'detailed' = 'recent';
  
  // Data
  recentSales: SaleResponse[] = [];
  detailedSales: SaleResponse[] = [];
  services: Service[] = [];
  products: Product[] = [];
  clients: Client[] = [];

  // Pagination for detailed
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Pagination for Recent view
  currentPageRecent = 0;
  pageSizeRecent = 5;
  totalElementsRecent = 0;

  // Filters for detailed
  search = '';
  fromDate = '';
  toDate = '';
  quickFilter: 'month' | 'quarter' | 'year' = 'month';

  // Create Form State
  newSale: SaleRequest = {
    clientId: undefined,
    itemType: 'SERVICE',
    quantity: 1,
    paymentMethod: 'CASH',
    saleDate: new Date().toISOString().split('T')[0],
    saleTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ':00',
    notes: ''
  };

  isSubmitting = false;

  ngOnInit(): void {
    this.loadRecentSales();
    this.loadServices();
    this.loadProducts();
    this.loadClients();
    this.setQuickFilter('month');
  }

  loadClients() {
    this.clientApi.getClients({ size: 500 }).subscribe({
      next: (res) => {
        this.clients = res.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading clients:', err)
    });
  }

  setViewMode(mode: 'recent' | 'detailed') {
    this.viewMode = mode;
    if (mode === 'detailed') {
      this.currentPage = 0;
      this.loadDetailedSales();
    } else {
      this.loadRecentSales();
    }
    this.cdr.detectChanges();
  }

  loadRecentSales() {
    const filters = {
      page: this.currentPageRecent,
      size: this.pageSizeRecent
    };
    this.saleApi.getSales(filters).subscribe({
      next: (pageData: any) => {
        if (pageData && typeof pageData === 'object') {
          if (Array.isArray(pageData.content)) {
            this.recentSales = pageData.content;
            this.totalElementsRecent = pageData.totalElements ?? pageData.content.length;
          } else if (Array.isArray(pageData)) {
            this.recentSales = pageData;
            this.totalElementsRecent = pageData.length;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading recent sales:', err)
    });
  }

  goToPageRecent(p: number) {
    this.currentPageRecent = p;
    this.loadRecentSales();
  }

  loadDetailedSales() {
    const filters = {
      search: this.search,
      fromDate: this.fromDate,
      toDate: this.toDate,
      page: this.currentPage,
      size: this.pageSize
    };
    this.saleApi.getSales(filters).subscribe({
      next: (pageData: any) => {
        if (pageData && typeof pageData === 'object') {
          if (Array.isArray(pageData.content)) {
            this.detailedSales = pageData.content;
            this.totalElements = pageData.totalElements ?? pageData.content.length;
            this.totalPages = pageData.totalPages ?? Math.ceil(this.totalElements / this.pageSize);
          } else if (Array.isArray(pageData)) {
            this.detailedSales = pageData;
            this.totalElements = pageData.length;
            this.totalPages = Math.ceil(pageData.length / this.pageSize);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading sales:', err)
    });
  }

  loadServices() {
    this.serviceApi.getServices({ active: true, size: 200 }).subscribe({
      next: (res) => {
        this.services = res.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading services:', err)
    });
  }

  loadProducts() {
    this.productApi.getProducts({ size: 500 }).subscribe({
      next: (res) => {
        this.products = res.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading products:', err)
    });
  }

  setQuickFilter(filter: 'month' | 'quarter' | 'year') {
    this.quickFilter = filter;
    const now = new Date();
    let start: Date;
    let end: Date;

    if (filter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filter === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now.getFullYear(), start.getMonth() + 3, 0);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }
    
    // Convert to UTC-safe YYYY-MM-DD
    this.fromDate = this.formatDate(start);
    this.toDate = this.formatDate(end);
    this.currentPage = 0;
    
    if (this.viewMode === 'detailed') {
      this.loadDetailedSales();
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  onSearchChange() {
    this.currentPage = 0;
    this.loadDetailedSales();
  }



  goToPage(p: number) {
    if (p >= 0 && p < this.totalPages) {
      this.currentPage = p;
      this.loadDetailedSales();
    }
  }

  registerSale() {
    if (!this.newSale.clientId) {
      alert('Debe seleccionar un cliente.');
      return;
    }
    if (this.newSale.itemType === 'SERVICE' && !this.newSale.serviceId) {
      alert('Debe seleccionar un servicio.');
      return;
    }
    if (this.newSale.itemType === 'PRODUCT' && !this.newSale.inventoryProductId) {
      alert('Debe seleccionar un producto del inventario.');
      return;
    }
    if (this.newSale.quantity <= 0) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }

    this.newSale.clientId = Number(this.newSale.clientId);
    if (this.newSale.serviceId) this.newSale.serviceId = Number(this.newSale.serviceId);
    if (this.newSale.unitPrice) this.newSale.unitPrice = Number(this.newSale.unitPrice);
    this.newSale.quantity = Number(this.newSale.quantity);

    // If it's a service and no unit price provided, backend assigns default service price.
    // Ensure we delete optional empty fields so they don't block.
    const payload = { ...this.newSale };
    if (payload.itemType === 'SERVICE') {
        delete payload.inventoryProductId;
    } else {
        delete payload.serviceId;
    }

    // append seconds to time if not present
    if (payload.saleTime && payload.saleTime.length === 5) {
      payload.saleTime += ':00';
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.saleApi.createSale(payload).subscribe({
      next: (res) => {
        this.resetForm();
        this.isSubmitting = false;
        if (this.viewMode === 'recent') {
          this.loadRecentSales();
        } else {
          this.loadDetailedSales();
        }
      },
      error: (err) => {
        console.error('Error creando venta:', err);
        this.isSubmitting = false;
        let errorMessage = 'Error al registrar la venta. ';
        if(err.error) errorMessage += JSON.stringify(err.error);
        alert(errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  resetForm() {
    this.newSale = {
      itemType: 'SERVICE',
      quantity: 1,
      paymentMethod: 'CASH',
      saleDate: new Date().toISOString().split('T')[0],
      saleTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ':00',
      notes: ''
    };
    this.cdr.detectChanges();
  }

  exportPdf() {
    this.saleApi.exportSalesToPdf({ search: this.search, fromDate: this.fromDate, toDate: this.toDate }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_ventas_${this.fromDate}_${this.toDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (err) => {
        console.error('Error exporting PDF', err);
        alert('Error al generar el PDF.');
      }
    });
  }

  getPaymentMethodName(method: PaymentMethod | null): string {
    switch(method) {
      case 'CASH': return 'Efectivo';
      case 'DEBIT_CARD': return 'T. Débito';
      case 'CREDIT_CARD': return 'T. Crédito';
      case 'BANK_TRANSFER': return 'Transferencia';
      case 'BIZUM': return 'Bizum';
      default: return 'No definido';
    }
  }

  getItemTypeName(type: SaleItemType): string {
    return type === 'SERVICE' ? 'Servicio' : 'Producto';
  }
}
