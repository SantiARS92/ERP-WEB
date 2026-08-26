import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { MonthlyDetailedReport } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informe-mensual-detallado',
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './mensual-detallado.html',
})
export class InformeMensualDetallado implements OnInit {
  reportData: MonthlyDetailedReport | null = null;
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
  isDownloadingPdf = false;
  downloadSuccess = false;

  constructor(private reportApi: ReportApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getMonthlyDetailed(this.selectedYear, this.selectedMonth).subscribe({
      next: (data) => { this.reportData = data; this.cdr.detectChanges(); },
      error: () => { this.hasError = true; this.reportData = null; this.cdr.detectChanges(); }
    });
  }

  exportPdf() {
    this.isDownloadingPdf = true;
    this.reportApi.getMonthlyDetailedPdf(this.selectedYear, this.selectedMonth).subscribe({
      next: (blob) => {
        this.isDownloadingPdf = false;
        this.downloadSuccess = true;
        setTimeout(() => this.downloadSuccess = false, 3000);
        console.log('PDF generado con éxito');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-mensual-detallado-${this.selectedYear}-${this.selectedMonth}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges();
      },
      error: () => { 
        this.isDownloadingPdf = false;
        this.cdr.detectChanges();
      }
    });
  }

  getBarHeightPercentage(value: number, max: number): string {
    if (!max || max === 0) return '0%';
    return `${Math.min((value / max) * 100, 100)}%`;
  }
}
