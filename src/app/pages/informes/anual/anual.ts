import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { AnnualConsolidatedReport } from '../../../core/models/report.model';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informe-anual',
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
        this.reportData = null;
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
