import { DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { QuarterlyDetailedReport } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';
import { FileDownloadService } from '../../../core/services/file-download.service';

@Component({
  selector: 'app-informe-trimestral',
  imports: [DecimalPipe, SlicePipe, NgClass, RouterLink, FormsModule],
  templateUrl: './trimestral.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeTrimestral implements OnInit {
  selectedYear: number = new Date().getFullYear();
  selectedQuarter: number = Math.ceil((new Date().getMonth() + 1) / 3);
  availableYears: number[] = [2024, 2025, 2026];
  availableQuarters = [
    { value: 1, label: '1er Trimestre' },
    { value: 2, label: '2do Trimestre' },
    { value: 3, label: '3er Trimestre' },
    { value: 4, label: '4to Trimestre' }
  ];
  private readonly reportDataSignal = signal<QuarterlyDetailedReport | null>(null);
  private readonly hasErrorSignal = signal(false);
  private readonly isDownloadingPdfSignal = signal(false);
  private readonly downloadSuccessSignal = signal(false);
  private readonly maxProfitToScaleChartSignal = signal(20000);

  private reportApi = inject(ReportApiService);
  private fileDownload = inject(FileDownloadService);

  get reportData() { return this.reportDataSignal(); }
  set reportData(value: QuarterlyDetailedReport | null) { this.reportDataSignal.set(value); }

  get hasError() { return this.hasErrorSignal(); }
  set hasError(value: boolean) { this.hasErrorSignal.set(value); }

  get isDownloadingPdf() { return this.isDownloadingPdfSignal(); }
  set isDownloadingPdf(value: boolean) { this.isDownloadingPdfSignal.set(value); }

  get downloadSuccess() { return this.downloadSuccessSignal(); }
  set downloadSuccess(value: boolean) { this.downloadSuccessSignal.set(value); }

  get maxProfitToScaleChart() { return this.maxProfitToScaleChartSignal(); }
  set maxProfitToScaleChart(value: number) { this.maxProfitToScaleChartSignal.set(value); }

  ngOnInit() { this.loadData(); }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getQuarterlyDetailed(this.selectedYear, this.selectedQuarter).subscribe({
      next: (data) => {
        this.reportData = data;
        const maxProfit = Math.max(...data.profitEvolution.map(p => p.operatingProfit), 1000);
        this.maxProfitToScaleChart = Math.ceil(maxProfit / 5000) * 5000;
      },
      error: () => {
        this.hasError = true;
        this.reportData = null;
      }
    });
  }

  exportPdf() {
    this.isDownloadingPdf = true;
    this.reportApi.getQuarterlyDetailedPdf(this.selectedYear, this.selectedQuarter).subscribe({
      next: (blob) => {
        this.isDownloadingPdf = false;
        this.downloadSuccess = true;
        setTimeout(() => this.downloadSuccess = false, 3000);
        this.fileDownload.downloadBlob(blob, `informe-trimestral-${this.selectedYear}-Q${this.selectedQuarter}.pdf`);
      },
      error: () => { 
        this.isDownloadingPdf = false;
      }
    });
  }

  getAbs(val: number | null): number { return Math.abs(val || 0); }

  getNormalizedY(profit: number, totalHeight = 250): number {
    const maxData = this.maxProfitToScaleChart || 1;
    const mapped = ((profit / maxData) * 200) + 20;
    return totalHeight - mapped;
  }

  getSvgPoints(): string {
    if (!this.reportData || this.reportData.profitEvolution.length < 3) return '';
    const p1Y = this.getNormalizedY(this.reportData.profitEvolution[0].operatingProfit);
    const p2Y = this.getNormalizedY(this.reportData.profitEvolution[1].operatingProfit);
    const p3Y = this.getNormalizedY(this.reportData.profitEvolution[2].operatingProfit);
    return `100,${p1Y} 500,${p2Y} 900,${p3Y}`;
  }

  getFormattedKScale(multiplier: number): string {
    const max = this.maxProfitToScaleChart;
    return `$${(max * multiplier / 1000).toFixed(0)}k`;
  }
}
