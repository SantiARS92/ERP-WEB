import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { RankingResponse } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';
import { createPagedResource } from '../../../core/state/paged-resource';

@Component({
  selector: 'app-ranking-servicios',
  imports: [DecimalPipe, NgClass, RouterLink, FormsModule],
  templateUrl: './ranking-servicios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeRankingServicios implements OnInit {
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  availableYears: number[] = [2024, 2025, 2026];
  availableMonths = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];
  private readonly currentPageSignal = signal(0);
  private reportApi = inject(ReportApiService);
  private readonly resource = createPagedResource({
    initialFilters: { type: 'SERVICE' as const, year: this.selectedYear, month: this.selectedMonth, page: 0, size: 10 },
    fetcher: (filters) => this.reportApi.getRanking(filters.type, filters.year, filters.month, filters.page, filters.size),
  });

  readonly rankingData = computed<RankingResponse | null>(() => {
    if (this.resource.isLoading() && this.resource.totalElements() === 0 && !this.resource.error()) {
      return null;
    }

    return {
      type: 'SERVICE',
      year: this.selectedYear,
      month: this.selectedMonth,
      content: this.resource.items(),
      totalElements: this.resource.totalElements(),
      totalPages: this.resource.totalPages(),
      number: this.resource.page(),
      page: this.resource.page(),
      size: this.resource.pageSize(),
      first: this.resource.page() === 0,
      last: this.resource.page() >= Math.max(this.resource.totalPages() - 1, 0),
    };
  });
  readonly hasError = computed(() => this.resource.error() !== null);
  readonly maxCitas = computed(() => Math.max(...this.resource.items().map((item) => item.totalCount), 1));

  ngOnInit() { this.loadData(); }

  loadData() {
    this.resource.setFilters({
      type: 'SERVICE',
      year: this.selectedYear,
      month: this.selectedMonth,
      page: this.currentPageSignal(),
      size: 10,
    });
  }

  nextPage() {
    const rankingData = this.rankingData();
    if (rankingData && !rankingData.last) {
      this.currentPageSignal.update((value) => value + 1);
      this.loadData();
    }
  }

  prevPage() {
    if (this.currentPageSignal() > 0) {
      this.currentPageSignal.update((value) => value - 1);
      this.loadData();
    }
  }

  goToPage(page: number) {
    this.currentPageSignal.set(page);
    this.loadData();
  }

  getPagesArray(): number[] {
    const rankingData = this.rankingData();
    if (!rankingData) return [];
    return Array(rankingData.totalPages).fill(0).map((_, i) => i);
  }

  getServiceWidth(citas: number): string { return `${(citas / this.maxCitas()) * 100}%`; }

  getServiceColor(index: number): string {
    const shades = ['bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200', 'bg-blue-100'];
    return shades[index % shades.length];
  }

}
