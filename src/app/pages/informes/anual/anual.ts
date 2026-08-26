import { CurrencyPipe, DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { AnnualConsolidatedReport } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informe-anual',
  imports: [CurrencyPipe, DecimalPipe, SlicePipe, NgClass, RouterLink, FormsModule],
  templateUrl: './anual.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeAnual implements OnInit {
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [2024, 2025, 2026];
  private readonly reportDataSignal = signal<AnnualConsolidatedReport | null>(null);
  private readonly hasErrorSignal = signal(false);
  private readonly isDownloadingPdfSignal = signal(false);
  private readonly downloadSuccessSignal = signal(false);
  private readonly maxMonthlyValueSignal = signal(1000);

  private reportApi = inject(ReportApiService);

  get reportData() { return this.reportDataSignal(); }
  set reportData(value: AnnualConsolidatedReport | null) { this.reportDataSignal.set(value); }

  get hasError() { return this.hasErrorSignal(); }
  set hasError(value: boolean) { this.hasErrorSignal.set(value); }

  get isDownloadingPdf() { return this.isDownloadingPdfSignal(); }
  set isDownloadingPdf(value: boolean) { this.isDownloadingPdfSignal.set(value); }

  get downloadSuccess() { return this.downloadSuccessSignal(); }
  set downloadSuccess(value: boolean) { this.downloadSuccessSignal.set(value); }

  get maxMonthlyValue() { return this.maxMonthlyValueSignal(); }
  set maxMonthlyValue(value: number) { this.maxMonthlyValueSignal.set(value); }

  ngOnInit() { this.loadData(); }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getAnnualConsolidated(this.selectedYear).subscribe({
      next: (data) => {
        this.reportData = data;
        const maxFound = Math.max(...data.monthlyBreakdown.map(m => Math.max(m.grossIncome, m.grossExpenses)));
        this.maxMonthlyValue = maxFound > 0 ? maxFound : 1000;
      },
      error: () => {
        this.hasError = true;
        this.reportData = null;
      }
    });
  }

  exportPdf() {
    this.isDownloadingPdf = true;
    this.reportApi.getAnnualConsolidatedPdf(this.selectedYear).subscribe({
      next: (blob) => {
        this.isDownloadingPdf = false;
        this.downloadSuccess = true;
        setTimeout(() => this.downloadSuccess = false, 3000);
        console.log('PDF generado con éxito');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-anual-consolidado-${this.selectedYear}.pdf`;
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

  getBarHeightPercentage(value: number): string {
    if (!this.maxMonthlyValue || this.maxMonthlyValue === 0) return '0%';
    return `${Math.min((value / this.maxMonthlyValue) * 100, 100)}%`;
  }
}
