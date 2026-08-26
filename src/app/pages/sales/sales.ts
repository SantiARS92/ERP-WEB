import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CurrencyPipe, NgClass, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { SaleResponse, SaleItemType, PaymentMethod } from '../../core/models/sale.model';
import { Service } from '../../core/models/service.model';
import { Product } from '../../core/models/product.model';
import { Client } from '../../core/models/client.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-sales',
  imports: [SlicePipe, CurrencyPipe, NgClass, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './sales.html',
  styles: ``,
})
export class Sales implements OnInit {
  private saleApi = inject(SaleApiService);
  private serviceApi = inject(ServiceApiService);
  private productApi = inject(ProductApiService);
  private clientApi = inject(ClientApiService);
  private cdr = inject(ChangeDetectorRef);

  // Data
  sales: SaleResponse[] = [];
  services: Service[] = [];
  products: Product[] = [];
  clients: Client[] = [];

  // Pagination for detailed
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;


  // Filters for detailed
  search = '';
  fromDate = '';
  toDate = '';
  quickFilter: 'month' | 'quarter' | 'year' = 'month';



  ngOnInit(): void {
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
            this.sales = pageData.content;
            this.totalElements = pageData.totalElements ?? pageData.content.length;
            this.totalPages = pageData.totalPages ?? Math.ceil(this.totalElements / this.pageSize);
          } else if (Array.isArray(pageData)) {
            this.sales = pageData;
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
    
    this.loadDetailedSales();
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



  exportPdf() {
    this.saleApi.exportSalesToPdf({ search: this.search, fromDate: this.fromDate, toDate: this.toDate }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_ventas_${this.fromDate}_${this.toDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
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
