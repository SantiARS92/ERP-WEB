import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, NgClass, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { SaleItemType, PaymentMethod } from '../../core/models/sale.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { createPagedResource } from '../../core/state/paged-resource';
import { toIsoDate } from '../../core/utils/date.util';
import { FileDownloadService } from '../../core/services/file-download.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-sales',
  imports: [SlicePipe, CurrencyPipe, NgClass, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './sales.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sales {
  private saleApi = inject(SaleApiService);
  private fileDownload = inject(FileDownloadService);
  private notification = inject(NotificationService);
  readonly pageSize = 10;
  readonly search = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly quickFilter = signal<'month' | 'quarter' | 'year'>('month');
  private readonly resource = createPagedResource({
    initialFilters: { search: '', fromDate: '', toDate: '', page: 0, size: this.pageSize },
    fetcher: (filters) => this.saleApi.getSales(filters),
  });
  readonly sales = this.resource.items;
  readonly totalElements = this.resource.totalElements;
  readonly currentPage = this.resource.page;
  readonly totalPages = this.resource.totalPages;
  readonly hasError = computed(() => this.resource.error() !== null);
  readonly isLoading = this.resource.isLoading;

  constructor() {
    this.setQuickFilter('month');
  }

  setQuickFilter(filter: 'month' | 'quarter' | 'year') {
    this.quickFilter.set(filter);
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
    const fromDate = toIsoDate(start);
    const toDate = toIsoDate(end);

    this.fromDate.set(fromDate);
    this.toDate.set(toDate);
    this.resource.setFilters({ search: this.search(), fromDate, toDate, page: 0 });
  }

  onSearchChange(partial: { search?: string; fromDate?: string; toDate?: string }) {
    if (partial.search !== undefined) {
      this.search.set(partial.search);
    }
    if (partial.fromDate !== undefined) {
      this.fromDate.set(partial.fromDate);
    }
    if (partial.toDate !== undefined) {
      this.toDate.set(partial.toDate);
    }

    this.resource.setFilters({
      search: partial.search ?? this.search(),
      fromDate: partial.fromDate ?? this.fromDate(),
      toDate: partial.toDate ?? this.toDate(),
      page: 0,
    });
  }



  goToPage(p: number) {
    if (p >= 0 && p < this.totalPages()) {
      this.resource.setPage(p);
    }
  }



  exportPdf() {
    this.saleApi.exportSalesToPdf({ search: this.search(), fromDate: this.fromDate(), toDate: this.toDate() }).subscribe({
      next: (blob) => {
        this.fileDownload.downloadBlob(blob, `historial_ventas_${this.fromDate()}_${this.toDate()}.pdf`);
      },
      error: () => {
        this.notification.error('Error al generar el PDF.');
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

  reload() {
    this.resource.reload();
  }
}
