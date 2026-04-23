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

  expenses: ExpenseResponse[] = [];

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  search = '';
  fromDate = '';
  toDate = '';
  quickFilter: 'month' | 'quarter' | 'year' = 'month';
  
  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'SUPPLIES', label: 'Suministros' },
    { value: 'SERVICES', label: 'Servicios'   },
    { value: 'OTHER',    label: 'Otros'        },
  ];

  ngOnInit(): void {
    this.setQuickFilter('month');
  }



  loadDetailedExpenses() {
    const filters = {
      search: this.search,
      fromDate: this.fromDate,
      toDate: this.toDate,
      page: this.currentPage,
      size: this.pageSize
    };
    this.expenseApi.getExpenses(filters).subscribe({
      next: (data: any) => {
        if (data && typeof data === 'object') {
          if (Array.isArray(data.content)) {
            this.expenses = data.content;
            this.totalElements = data.totalElements ?? data.content.length;
            this.totalPages = data.totalPages ?? Math.ceil(this.totalElements / this.pageSize);
          } else if (Array.isArray(data)) {
            this.expenses = data;
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

    this.loadDetailedExpenses();
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
    this.loadDetailedExpenses();
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
