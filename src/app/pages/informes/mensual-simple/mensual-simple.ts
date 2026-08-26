import { DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { MonthlySimpleReport } from '../../../core/models/report.model';

@Component({
  selector: 'app-informe-mensual-simple',
  imports: [DecimalPipe, SlicePipe, NgClass, RouterLink],
  templateUrl: './mensual-simple.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeMensualSimple implements OnInit {
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  private readonly reportDataSignal = signal<MonthlySimpleReport | null>(null);
  private readonly isDownloadingPdfSignal = signal(false);
  private readonly downloadSuccessSignal = signal(false);
  private readonly hasErrorSignal = signal(false);
  private readonly maxIncomeExpenseSignal = signal(0);
  private readonly maxTopServiceCountSignal = signal(0);

  private reportApi = inject(ReportApiService);

  get reportData() { return this.reportDataSignal(); }
  set reportData(value: MonthlySimpleReport | null) { this.reportDataSignal.set(value); }

  get isDownloadingPdf() { return this.isDownloadingPdfSignal(); }
  set isDownloadingPdf(value: boolean) { this.isDownloadingPdfSignal.set(value); }

  get downloadSuccess() { return this.downloadSuccessSignal(); }
  set downloadSuccess(value: boolean) { this.downloadSuccessSignal.set(value); }

  get hasError() { return this.hasErrorSignal(); }
  set hasError(value: boolean) { this.hasErrorSignal.set(value); }

  get maxIncomeExpense() { return this.maxIncomeExpenseSignal(); }
  set maxIncomeExpense(value: number) { this.maxIncomeExpenseSignal.set(value); }

  get maxTopServiceCount() { return this.maxTopServiceCountSignal(); }
  set maxTopServiceCount(value: number) { this.maxTopServiceCountSignal.set(value); }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.hasError = false;
    this.reportData = null;
    this.reportApi.getMonthlySimple(this.selectedYear, this.selectedMonth).subscribe({
      next: (data) => {
        this.reportData = data;
        this.maxIncomeExpense = Math.max(...data.lastThreeMonths.map(m => Math.max(m.income, m.expenses)), 1);
        this.maxTopServiceCount = Math.max(...data.topServices.map(s => s.totalCount), 1);
      },
      error: () => {
        this.hasError = true;
        this.reportData = null;
      }
    });
  }

  getBarHeight(value: number): string {
    return `${(value / this.maxIncomeExpense) * 100}%`;
  }

  getServiceWidth(count: number): string {
    return `${(count / this.maxTopServiceCount) * 100}%`;
  }

  getServiceColor(index: number): string {
    const colors = ['bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-slate-400'];
    return colors[index % colors.length];
  }

  getDayTranslate(englishDay: string): string {
    const dayMap: Record<string, string> = {
      'MONDAY': 'Lun', 'TUESDAY': 'Mar', 'WEDNESDAY': 'Mié',
      'THURSDAY': 'Jue', 'FRIDAY': 'Vie', 'SATURDAY': 'Sáb', 'SUNDAY': 'Dom'
    };
    return dayMap[englishDay] || englishDay;
  }

  getAbs(value: number | null): number {
    return Math.abs(value || 0);
  }

  onMonthChange() {
    this.loadData();
  }

  exportPdf() {
    if (this.isDownloadingPdf) return;
    
    this.isDownloadingPdf = true;

    this.reportApi.getMonthlySimplePdf(this.selectedYear, this.selectedMonth).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informe_Mensual_Simple_${this.selectedMonth}_${this.selectedYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        this.isDownloadingPdf = false;
        this.downloadSuccess = true;
        
        setTimeout(() => {
          this.downloadSuccess = false;
        }, 3000);
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        alert('Error al descargar el PDF. Inténtelo de nuevo.');
        this.isDownloadingPdf = false;
      }
    });
  }
}
