import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { AnnualConsolidatedReport, ReportMonthlyBreakdown } from '../../../core/models/report.model';

const MOCK_MONTHS: ReportMonthlyBreakdown[] = [
  { year: 2026, month: 1, monthLabel: 'Enero', grossIncome: 12500, grossExpenses: 8200, operatingProfit: 4300, estimatedVatPayable: 862, estimatedIrpfPayable: 645 },
  { year: 2026, month: 2, monthLabel: 'Febrero', grossIncome: 14200, grossExpenses: 9100, operatingProfit: 5100, estimatedVatPayable: 1022, estimatedIrpfPayable: 765 },
  { year: 2026, month: 3, monthLabel: 'Marzo', grossIncome: 15800, grossExpenses: 10200, operatingProfit: 5600, estimatedVatPayable: 1120, estimatedIrpfPayable: 840 },
  { year: 2026, month: 4, monthLabel: 'Abril', grossIncome: 16500, grossExpenses: 11000, operatingProfit: 5500, estimatedVatPayable: 1100, estimatedIrpfPayable: 825 },
  { year: 2026, month: 5, monthLabel: 'Mayo', grossIncome: 18200, grossExpenses: 11500, operatingProfit: 6700, estimatedVatPayable: 1340, estimatedIrpfPayable: 1005 },
  { year: 2026, month: 6, monthLabel: 'Junio', grossIncome: 19500, grossExpenses: 12000, operatingProfit: 7500, estimatedVatPayable: 1500, estimatedIrpfPayable: 1125 },
  { year: 2026, month: 7, monthLabel: 'Julio', grossIncome: 22450, grossExpenses: 12500, operatingProfit: 9950, estimatedVatPayable: 1990, estimatedIrpfPayable: 1492 },
  { year: 2026, month: 8, monthLabel: 'Agosto', grossIncome: 21200, grossExpenses: 12800, operatingProfit: 8400, estimatedVatPayable: 1680, estimatedIrpfPayable: 1260 },
  { year: 2026, month: 9, monthLabel: 'Septiembre', grossIncome: 24500, grossExpenses: 13000, operatingProfit: 11500, estimatedVatPayable: 2300, estimatedIrpfPayable: 1725 },
  { year: 2026, month: 10, monthLabel: 'Octubre', grossIncome: 26800, grossExpenses: 13500, operatingProfit: 13300, estimatedVatPayable: 2660, estimatedIrpfPayable: 1995 },
  { year: 2026, month: 11, monthLabel: 'Noviembre', grossIncome: 28200, grossExpenses: 14000, operatingProfit: 14200, estimatedVatPayable: 2840, estimatedIrpfPayable: 2130 },
  { year: 2026, month: 12, monthLabel: 'Diciembre', grossIncome: 32500, grossExpenses: 14300, operatingProfit: 18200, estimatedVatPayable: 3640, estimatedIrpfPayable: 2730 },
];

const MOCK_ANNUAL: AnnualConsolidatedReport = {
  year: 2026,
  grossIncome: 242350, grossExpenses: 141100, operatingProfit: 101250,
  estimatedIncomeBase: 200289.26, estimatedExpenseBase: 116611.57,
  estimatedOutputVat: 42060.74, estimatedInputVat: 24488.43,
  estimatedVatPayable: 17572.31, estimatedIrpfPayable: 15187.5,
  estimatedTotalTaxes: 32759.81, profitabilityRatio: 41.8,
  operatingProfitChangePercentage: 14.2,
  monthlyBreakdown: MOCK_MONTHS,
  profitEvolution: MOCK_MONTHS.map(m => ({ year: m.year, month: m.month, monthLabel: m.monthLabel, operatingProfit: m.operatingProfit }))
};

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informe-anual',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './anual.html',
})
export class InformeAnual implements OnInit {
  reportData: AnnualConsolidatedReport | null = null;
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [2024, 2025, 2026];
  hasError = false;
  isDownloadingPdf = false;
  downloadSuccess = false;
  maxMonthlyValue: number = 1000;

  constructor(private reportApi: ReportApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getAnnualConsolidated(this.selectedYear).subscribe({
      next: (data) => {
        this.reportData = data;
        const maxFound = Math.max(...data.monthlyBreakdown.map(m => Math.max(m.grossIncome, m.grossExpenses)));
        this.maxMonthlyValue = maxFound > 0 ? maxFound : 1000;
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.reportData = MOCK_ANNUAL;
        this.maxMonthlyValue = 32500;
        this.cdr.detectChanges();
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

  getBarHeightPercentage(value: number): string {
    if (!this.maxMonthlyValue || this.maxMonthlyValue === 0) return '0%';
    return `${Math.min((value / this.maxMonthlyValue) * 100, 100)}%`;
  }
}
