import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-6 flex flex-col sm:flex-row justify-between items-center gap-6 px-4">
      <!-- Minimalist Status Info -->
      <div class="text-[13px] text-slate-500 font-medium h-8 flex items-center">
        Mostrando <span class="text-slate-900 font-bold mx-1">{{ fromRecord }}</span> 
        a <span class="text-slate-900 font-bold mx-1">{{ toRecord }}</span> 
        de <span class="text-slate-900 font-bold mx-1">{{ totalElements }}</span> {{ itemsLabel }}
      </div>

      <!-- Grouped "Clean" Controls -->
      <div class="inline-flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <!-- Previous Page -->
        <button 
          (click)="onPageClick(currentPage - 1)" 
          [disabled]="currentPage === 0"
          class="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none group border-r border-slate-100"
          title="Anterior"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <!-- Page List -->
        <div class="flex items-center border-r border-slate-100">
          <ng-container *ngFor="let page of visiblePages; let last = last">
            <!-- Ellipsis -->
            @if (page === -1) {
              <span class="w-8 h-8 flex items-center justify-center text-slate-300 font-medium border-r border-slate-100 select-none last:border-r-0">...</span>
            } @else {
              <button 
                (click)="onPageClick(page)"
                [class]="page === currentPage 
                  ? 'bg-blue-500 text-white font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-medium'"
                class="w-8 h-8 flex items-center justify-center text-[13px] transition-all border-r border-slate-100 last:border-r-0"
              >
                {{ page + 1 }}
              </button>
            }
          </ng-container>
        </div>

        <!-- Next Page -->
        <button 
          (click)="onPageClick(currentPage + 1)" 
          [disabled]="currentPage >= totalPages - 1"
          class="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Siguiente"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  `,
})
export class PaginationComponent implements OnChanges {
  @Input() totalElements: number = 0;
  @Input() pageSize: number = 10;
  @Input() currentPage: number = 0;
  @Input() itemsLabel: string = 'resultados';
  @Output() pageChange = new EventEmitter<number>();

  totalPages: number = 0;
  visiblePages: number[] = [];

  get fromRecord(): number {
    if (this.totalElements === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  get toRecord(): number {
    const to = (this.currentPage + 1) * this.pageSize;
    return to > this.totalElements ? this.totalElements : to;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.calculatePages();
  }

  private calculatePages() {
    this.totalPages = Math.ceil(this.totalElements / this.pageSize) || 1;
    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 0; i < this.totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, this.currentPage - 1);
      let end = Math.min(this.totalPages - 2, this.currentPage + 1);

      if (this.currentPage <= 2) {
        end = 3;
      } else if (this.currentPage >= this.totalPages - 3) {
        start = this.totalPages - 4;
      }

      if (start > 1) pages.push(-1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < this.totalPages - 2) pages.push(-1);
      
      pages.push(this.totalPages - 1);
    }
    this.visiblePages = pages;
  }

  onPageClick(page: number) {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}
