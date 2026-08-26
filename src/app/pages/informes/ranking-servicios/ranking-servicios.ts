import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { RankingResponse } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ranking-servicios',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ranking-servicios.html',
})
export class InformeRankingServicios implements OnInit {
  rankingData: RankingResponse | null = null;
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  availableYears: number[] = [2024, 2025, 2026];
  availableMonths = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];
  hasError = false;
  currentPage: number = 0;
  maxCitas: number = 0;
  private reportApi = inject(ReportApiService);
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.hasError = false;
    this.rankingData = null;
    this.reportApi.getRanking('SERVICE', this.selectedYear, this.selectedMonth, this.currentPage, 10).subscribe({
      next: (data) => {
        this.rankingData = data;
        const maxFound = Math.max(...data.content.map(i => i.totalCount));
        this.maxCitas = maxFound > 0 ? maxFound : 1;
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.rankingData = null;
        this.cdr.detectChanges();
      }
    });
  }

  nextPage() {
    if (this.rankingData && !this.rankingData.last) { this.currentPage++; this.loadData(); }
  }

  prevPage() {
    if (this.currentPage > 0) { this.currentPage--; this.loadData(); }
  }

  goToPage(page: number) { this.currentPage = page; this.loadData(); }

  getPagesArray(): number[] {
    if (!this.rankingData) return [];
    return Array(this.rankingData.totalPages).fill(0).map((_, i) => i);
  }

  getServiceWidth(citas: number): string { return `${(citas / this.maxCitas) * 100}%`; }

  getServiceColor(index: number): string {
    const shades = ['bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200', 'bg-blue-100'];
    return shades[index % shades.length];
  }

}
