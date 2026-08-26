import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ExpenseCategory } from '../../core/models/expense.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { createPagedResource } from '../../core/state/paged-resource';
import { toIsoDate } from '../../core/utils/date.util';
import { FileDownloadService } from '../../core/services/file-download.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-gastos',
  imports: [DecimalPipe, NgClass, RouterLink, FormsModule, PaginationComponent],
  templateUrl: './gastos.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gastos {
  private expenseApi = inject(ExpenseApiService);
  private fileDownload = inject(FileDownloadService);
  private notification = inject(NotificationService);
  readonly pageSize = 10;
  readonly search = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly quickFilter = signal<'month' | 'quarter' | 'year'>('month');
  private readonly resource = createPagedResource({
    initialFilters: { search: '', fromDate: '', toDate: '', page: 0, size: this.pageSize },
    fetcher: (filters) => this.expenseApi.getExpenses(filters),
  });
  readonly expenses = this.resource.items;
  readonly totalElements = this.resource.totalElements;
  readonly currentPage = this.resource.page;
  readonly totalPages = this.resource.totalPages;
  readonly hasError = computed(() => this.resource.error() !== null);
  readonly isLoading = this.resource.isLoading;
  
  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'SUPPLIES', label: 'Suministros' },
    { value: 'SERVICES', label: 'Servicios'   },
    { value: 'OTHER',    label: 'Otros'        },
  ];

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





  exportPdf() {
    this.expenseApi.exportExpensesToPdf({
      search: this.search(),
      fromDate: this.fromDate(),
      toDate: this.toDate()
    }).subscribe({
      next: (blob) => {
        this.fileDownload.downloadBlob(blob, `historial_gastos_${this.fromDate()}_${this.toDate()}.pdf`);
      },
      error: () => {
        this.notification.error('Error al generar el PDF.');
      }
    });
  }

  getCategoryLabel(category: ExpenseCategory): string {
    return this.categories.find(c => c.value === category)?.label ?? category;
  }

  getCategoryClasses(category: ExpenseCategory): string {
    switch (category) {
      case 'SUPPLIES': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'SERVICES': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'OTHER':    return 'bg-slate-50 text-slate-600 border-slate-200';
      default:         return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  goToPage(p: number) {
    if (p >= 0 && p < this.totalPages()) {
      this.resource.setPage(p);
    }
  }

  reload() {
    this.resource.reload();
  }

}
