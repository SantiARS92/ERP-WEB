import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';


@Component({
  selector: 'app-pagination',
  imports: [],
  template: `
    <div class="mt-6 flex flex-col sm:flex-row justify-between items-center gap-6 px-4">
      <!-- Minimalist Status Info -->
      <div class="text-[13px] text-slate-500 font-medium h-8 flex items-center">
        Mostrando <span class="text-slate-900 font-bold mx-1">{{ fromRecord() }}</span>
        a <span class="text-slate-900 font-bold mx-1">{{ toRecord() }}</span>
        de <span class="text-slate-900 font-bold mx-1">{{ totalElements() }}</span> {{ itemsLabel() }}
      </div>

      <!-- Grouped "Clean" Controls -->
      <div class="inline-flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <!-- Previous Page -->
        <button
          (click)="onPageClick(currentPage() - 1)"
          [disabled]="currentPage() === 0"
          class="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none group border-r border-slate-100"
          title="Anterior"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <!-- Page List -->
        <div class="flex items-center border-r border-slate-100">
          @for (page of visiblePages(); track page) {
            <!-- Ellipsis -->
            @if (page === -1) {
              <span class="w-8 h-8 flex items-center justify-center text-slate-300 font-medium border-r border-slate-100 select-none last:border-r-0">...</span>
            } @else {
              <button
                (click)="onPageClick(page)"
                [class]="page === currentPage() 
                  ? 'bg-blue-500 text-white font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-medium'"
                class="w-8 h-8 flex items-center justify-center text-[13px] transition-all border-r border-slate-100 last:border-r-0"
              >
                {{ page + 1 }}
              </button>
            }
          }
        </div>

        <!-- Next Page -->
        <button
          (click)="onPageClick(currentPage() + 1)"
          [disabled]="currentPage() >= totalPages() - 1"
          class="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Siguiente"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly totalElements = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly currentPage = input<number>(0);
  readonly itemsLabel = input<string>('resultados');
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);

  readonly visiblePages = computed(() => this.calculatePages(this.totalPages(), this.currentPage()));

  readonly fromRecord = computed(() => {
    if (this.totalElements() === 0) return 0;
    return this.currentPage() * this.pageSize() + 1;
  });

  readonly toRecord = computed(() => {
    const to = (this.currentPage() + 1) * this.pageSize();
    return to > this.totalElements() ? this.totalElements() : to;
  });

  private calculatePages(totalPages: number, currentPage: number) {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      if (currentPage <= 2) {
        end = 3;
      } else if (currentPage >= totalPages - 3) {
        start = totalPages - 4;
      }

      if (start > 1) pages.push(-1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push(-1);

      pages.push(totalPages - 1);
    }

    return pages;
  }

  onPageClick(page: number) {
    if (page >= 0 && page < this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
