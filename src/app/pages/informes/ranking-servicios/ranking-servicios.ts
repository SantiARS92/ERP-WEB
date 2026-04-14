import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { RankingResponse } from '../../../core/models/report.model';

const MOCK_RANKING: RankingResponse = {
  type: 'SERVICE', year: 2026, month: 3,
  page: 0, size: 10, totalElements: 8, totalPages: 1, first: true, last: true,
  content: [
    { position: 1, id: 1, name: 'Manicura en Gel', categoryName: 'Manicura', totalCount: 45, generatedIncome: 2250, averageDurationMinutes: 60 },
    { position: 2, id: 2, name: 'Tratamiento Facial', categoryName: 'Estética', totalCount: 32, generatedIncome: 3200, averageDurationMinutes: 90 },
    { position: 3, id: 3, name: 'Depilación Láser', categoryName: 'Depilación', totalCount: 28, generatedIncome: 4200, averageDurationMinutes: 45 },
    { position: 4, id: 4, name: 'Pedicura Spa', categoryName: 'Pedicura', totalCount: 22, generatedIncome: 1100, averageDurationMinutes: 75 },
    { position: 5, id: 5, name: 'Masaje Relajante', categoryName: 'Masajes', totalCount: 18, generatedIncome: 2160, averageDurationMinutes: 60 },
    { position: 6, id: 6, name: 'Limpieza Facial', categoryName: 'Estética', totalCount: 15, generatedIncome: 900, averageDurationMinutes: 45 },
    { position: 7, id: 7, name: 'Tinte y Peluquería', categoryName: 'Cabello', totalCount: 12, generatedIncome: 840, averageDurationMinutes: 120 },
    { position: 8, id: 8, name: 'Cejas y Pestañas', categoryName: 'Estética', totalCount: 8, generatedIncome: 400, averageDurationMinutes: 30 },
  ]
};

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ranking-servicios',
  standalone: true,
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

  isDownloadingPdf = false;
  downloadSuccess = false;

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
        this.rankingData = MOCK_RANKING;
        this.maxCitas = MOCK_RANKING.content[0]?.totalCount || 1;
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

  exportPdf() {
    if (this.isDownloadingPdf) return;
    
    this.isDownloadingPdf = true;
    this.cdr.detectChanges();

    this.reportApi.getRankingPdf('SERVICE', this.selectedYear, this.selectedMonth).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ranking_Servicios_${this.selectedMonth}_${this.selectedYear}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.isDownloadingPdf = false;
        this.downloadSuccess = true;
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.downloadSuccess = false;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        alert('Error al descargar el PDF. Inténtelo de nuevo.');
        this.isDownloadingPdf = false;
        this.cdr.detectChanges();
      }
    });
  }
}
