import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ExpenseResponse, ExpenseRequest, ExpenseCategory, ExpensePage } from '../../core/models/expense.model';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './gastos.html',
  styles: ``,
})
export class Gastos implements OnInit {
  private expenseApi = inject(ExpenseApiService);
  private cdr = inject(ChangeDetectorRef);

  viewMode: 'recent' | 'detailed' = 'recent';

  recentExpenses: ExpenseResponse[] = [];
  detailedExpenses: ExpenseResponse[] = [];

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Pagination for Recent view
  currentPageRecent = 0;
  pageSizeRecent = 5;
  totalElementsRecent = 0;

  search = '';
  fromDate = '';
  toDate = '';
  quickFilter: 'month' | 'quarter' | 'year' = 'month';
  filterCategory: ExpenseCategory | '' = '';
  
  conceptSuggestions: string[] = [];
  
  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'SUPPLIES', label: 'Suministros' },
    { value: 'SERVICES', label: 'Servicios'   },
    { value: 'OTHER',    label: 'Otros'        },
  ];

  newExpense: ExpenseRequest = {
    concept: '',
    category: 'SUPPLIES',
    amount: 0,
    quantity: 1,
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  isSubmitting = false;
  conceptSelectedFromSuggestions = false;

  ngOnInit(): void {
    this.loadRecentExpenses();
    this.setQuickFilter('month');
  }

  setViewMode(mode: 'recent' | 'detailed') {
    this.viewMode = mode;
    if (mode === 'detailed') {
      this.currentPage = 0;
      this.loadDetailedExpenses();
    } else {
      this.loadRecentExpenses();
    }
    this.cdr.detectChanges();
  }

  loadRecentExpenses() {
    const filters = {
      page: this.currentPageRecent,
      size: this.pageSizeRecent
    };
    this.expenseApi.getExpenses(filters).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object') {
          if (Array.isArray(data.content)) {
            this.recentExpenses = data.content;
            this.totalElementsRecent = data.totalElements ?? data.content.length;
          } else if (Array.isArray(data)) {
            this.recentExpenses = data;
            this.totalElementsRecent = data.length;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading recent expenses:', err)
    });
  }

  goToPageRecent(p: number) {
    this.currentPageRecent = p;
    this.loadRecentExpenses();
  }

  loadDetailedExpenses() {
    const filters = {
      search: this.search,
      category: this.filterCategory || undefined,
      fromDate: this.fromDate,
      toDate: this.toDate,
      page: this.currentPage,
      size: this.pageSize
    };
    this.expenseApi.getExpenses(filters).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object') {
          if (Array.isArray(data.content)) {
            this.detailedExpenses = data.content;
            this.totalElements = data.totalElements ?? data.content.length;
            this.totalPages = data.totalPages ?? Math.ceil(this.totalElements / this.pageSize);
          } else if (Array.isArray(data)) {
            this.detailedExpenses = data;
            this.totalElements = data.length;
            this.totalPages = Math.ceil(data.length / this.pageSize);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading expenses:', err)
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

    this.fromDate = this.formatDate(start);
    this.toDate = this.formatDate(end);
    this.currentPage = 0;

    if (this.viewMode === 'detailed') {
      this.loadDetailedExpenses();
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

  onConceptInput() {
    this.conceptSelectedFromSuggestions = false;
    const query = this.newExpense.concept;
    const category = this.newExpense.category;
    if (query && query.length >= 2) {
      this.expenseApi.getSuggestions(query, category).subscribe({
        next: (data) => {
          this.conceptSuggestions = data;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching suggestions:', err)
      });
    } else {
      this.conceptSuggestions = [];
    }
  }

  selectSuggestion(val: string) {
    this.newExpense.concept = val;
    this.conceptSelectedFromSuggestions = true;
    this.conceptSuggestions = [];
    this.cdr.detectChanges();
  }

  onSearchChange() {
    this.currentPage = 0;
    this.loadDetailedExpenses();
  }



  registerExpense() {
    if (!this.newExpense.concept?.trim()) {
      alert('Debe introducir un concepto.');
      return;
    }

    if (this.newExpense.category === 'SUPPLIES' && !this.conceptSelectedFromSuggestions) {
      alert('Para suministros, debe seleccionar un producto del inventario de las sugerencias.');
      return;
    }
    if (!this.newExpense.amount || this.newExpense.amount <= 0) {
      alert('El importe debe ser mayor a 0.');
      return;
    }

    const payload: ExpenseRequest = {
      ...this.newExpense,
      amount: Number(this.newExpense.amount),
      quantity: Number(this.newExpense.quantity || 1),
    };

    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.expenseApi.createExpense(payload).subscribe({
      next: () => {
        this.resetForm();
        this.isSubmitting = false;
        if (this.viewMode === 'recent') {
          this.loadRecentExpenses();
        } else {
          this.loadDetailedExpenses();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creando gasto:', err);
        this.isSubmitting = false;
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) || 'Error al registrar el gasto.';
        alert(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }

  resetForm() {
    this.newExpense = {
      concept: '',
      category: 'SUPPLIES',
      amount: 0,
      quantity: 1,
      expenseDate: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.conceptSuggestions = [];
    this.cdr.detectChanges();
  }

  exportPdf() {
    this.expenseApi.exportExpensesToPdf({
      search: this.search,
      fromDate: this.fromDate,
      toDate: this.toDate
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_gastos_${this.fromDate}_${this.toDate}.pdf`;
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
    if (p >= 0 && p < this.totalPages) {
      this.currentPage = p;
      this.loadDetailedExpenses();
    }
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
}
