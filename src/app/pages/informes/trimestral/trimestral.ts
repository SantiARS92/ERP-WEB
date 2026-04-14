import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { QuarterlyDetailedReport } from '../../../core/models/report.model';

const MOCK_QUARTERLY: QuarterlyDetailedReport = {
  year: 2026, quarter: 2, quarterLabel: '2º Trimestre 2026',
  grossIncome: 66150.00, grossExpenses: 22540.00, operatingProfit: 43610.00,
  estimatedIncomeBase: 54669.42, estimatedExpenseBase: 18628.10,
  estimatedOutputVat: 11480.58, estimatedInputVat: 3911.90,
  estimatedVatPayable: 7568.68, estimatedIrpfPayable: 8200.41,
  estimatedTotalTaxes: 15769.09, profitabilityRatio: 65.9,
  operatingProfitChangePercentage: 8.3,
  monthlyBreakdown: [
    { year: 2026, month: 4, monthLabel: 'Abril', grossIncome: 22450, grossExpenses: 7890, operatingProfit: 14560, estimatedVatPayable: 2565.3 },
    { year: 2026, month: 5, monthLabel: 'Mayo', grossIncome: 19200, grossExpenses: 6450, operatingProfit: 12750, estimatedVatPayable: 2203.5 },
    { year: 2026, month: 6, monthLabel: 'Junio', grossIncome: 24500, grossExpenses: 8200, operatingProfit: 16300, estimatedVatPayable: 2799.88 },
  ],
  profitEvolution: [
    { year: 2026, month: 4, monthLabel: 'Abril', operatingProfit: 14560 },
    { year: 2026, month: 5, monthLabel: 'Mayo', operatingProfit: 12750 },
    { year: 2026, month: 6, monthLabel: 'Junio', operatingProfit: 16300 },
  ]
};

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informe-trimestral',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './trimestral.html',
})
export class InformeTrimestral implements OnInit {
  reportData: QuarterlyDetailedReport | null = null;
  selectedYear: number = new Date().getFullYear();
  selectedQuarter: number = Math.ceil((new Date().getMonth() + 1) / 3);
  availableYears: number[] = [2024, 2025, 2026];
  availableQuarters = [
    { value: 1, label: '1er Trimestre' },
    { value: 2, label: '2do Trimestre' },
    { value: 3, label: '3er Trimestre' },
    { value: 4, label: '4to Trimestre' }
  ];
  hasError = false;
  isDownloadingPdf = false;
  downloadSuccess = false;
  maxProfitToScaleChart = 20000;

  constructor(private reportApi: ReportApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getQuarterlyDetailed(this.selectedYear, this.selectedQuarter).subscribe({
      next: (data) => {
        this.reportData = data;
        const maxProfit = Math.max(...data.profitEvolution.map(p => p.operatingProfit), 1000);
        this.maxProfitToScaleChart = Math.ceil(maxProfit / 5000) * 5000;
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.reportData = MOCK_QUARTERLY;
        this.maxProfitToScaleChart = 20000;
        this.cdr.detectChanges();
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
        console.log('PDF generado con éxito');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-trimestral-${this.selectedYear}-Q${this.selectedQuarter}.pdf`;
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

  getAbs(val: number | null): number { return Math.abs(val || 0); }

  getNormalizedY(profit: number, totalHeight: number = 250): number {
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
