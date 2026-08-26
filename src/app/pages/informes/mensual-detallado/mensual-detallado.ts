import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { MonthlyDetailedReport } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informe-mensual-detallado',
  imports: [DecimalPipe, RouterLink, FormsModule],
  templateUrl: './mensual-detallado.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeMensualDetallado implements OnInit {
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  availableYears: number[] = [2024, 2025, 2026];
  availableMonths = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];
  private readonly reportDataSignal = signal<MonthlyDetailedReport | null>(null);
  private readonly hasErrorSignal = signal(false);
  private readonly isDownloadingPdfSignal = signal(false);
  private readonly downloadSuccessSignal = signal(false);

  private reportApi = inject(ReportApiService);

  get reportData() { return this.reportDataSignal(); }
  set reportData(value: MonthlyDetailedReport | null) { this.reportDataSignal.set(value); }

  get hasError() { return this.hasErrorSignal(); }
  set hasError(value: boolean) { this.hasErrorSignal.set(value); }

  get isDownloadingPdf() { return this.isDownloadingPdfSignal(); }
  set isDownloadingPdf(value: boolean) { this.isDownloadingPdfSignal.set(value); }

  get downloadSuccess() { return this.downloadSuccessSignal(); }
  set downloadSuccess(value: boolean) { this.downloadSuccessSignal.set(value); }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getMonthlyDetailed(this.selectedYear, this.selectedMonth).subscribe({
      next: (data) => { this.reportData = data; },
      error: () => { this.hasError = true; this.reportData = null; }
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
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: () => { 
        this.isDownloadingPdf = false;
      }
    });
  }

  getBarHeightPercentage(value: number, max: number): string {
    if (!max || max === 0) return '0%';
    return `${Math.min((value / max) * 100, 100)}%`;
  }
}
