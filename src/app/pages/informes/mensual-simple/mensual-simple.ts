import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { MonthlySimpleReport } from '../../../core/models/report.model';

const MOCK_MONTHLY_SIMPLE: MonthlySimpleReport = {
  year: 2026, month: 3,
  totalIncome: 24500, totalExpenses: 8200, totalConfirmedAppointments: 142,
  incomeChangePercentage: 12, expenseChangePercentage: -5, confirmedAppointmentsChangePercentage: 8,
  lastThreeMonths: [
    { period: '2026-01', year: 2026, month: 1, income: 15000, expenses: 6200, confirmedAppointments: 98 },
    { period: '2026-02', year: 2026, month: 2, income: 19200, expenses: 7100, confirmedAppointments: 118 },
    { period: '2026-03', year: 2026, month: 3, income: 24500, expenses: 8200, confirmedAppointments: 142 },
  ],
  topServices: [
    { position: 1, id: 1, name: 'Manicura en Gel', categoryName: 'Manicura', totalCount: 45, generatedIncome: 2250, averageDurationMinutes: 60 },
    { position: 2, id: 2, name: 'Tratamiento Facial', categoryName: 'Estética', totalCount: 32, generatedIncome: 3200, averageDurationMinutes: 90 },
    { position: 3, id: 3, name: 'Depilación Láser', categoryName: 'Depilación', totalCount: 28, generatedIncome: 4200, averageDurationMinutes: 45 },
    { position: 4, id: 4, name: 'Pedicura Spa', categoryName: 'Pedicura', totalCount: 22, generatedIncome: 1100, averageDurationMinutes: 75 },
  ],
  busiestDays: [
    { dayOfWeek: 'SATURDAY', confirmedAppointments: 45, percentage: 45 },
    { dayOfWeek: 'FRIDAY', confirmedAppointments: 38, percentage: 38 },
    { dayOfWeek: 'SUNDAY', confirmedAppointments: 17, percentage: 17 },
  ]
};

@Component({
  selector: 'app-informe-mensual-simple',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mensual-simple.html',
})
export class InformeMensualSimple implements OnInit {
  reportData: MonthlySimpleReport | null = null;
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  isDownloadingPdf = false;
  downloadSuccess = false;
  
  Math = Math;
  hasError = false;
  maxIncomeExpense: number = 0;
  maxTopServiceCount: number = 0;

  constructor(private reportApi: ReportApiService, private cdr: ChangeDetectorRef) {}

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
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.reportData = MOCK_MONTHLY_SIMPLE;
        this.maxIncomeExpense = Math.max(...MOCK_MONTHLY_SIMPLE.lastThreeMonths.map(m => Math.max(m.income, m.expenses)), 1);
        this.maxTopServiceCount = Math.max(...MOCK_MONTHLY_SIMPLE.topServices.map(s => s.totalCount), 1);
        this.cdr.detectChanges();
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
    const dayMap: { [key: string]: string } = {
      'MONDAY': 'Lun', 'TUESDAY': 'Mar', 'WEDNESDAY': 'Mié',
      'THURSDAY': 'Jue', 'FRIDAY': 'Vie', 'SATURDAY': 'Sáb', 'SUNDAY': 'Dom'
    };
    return dayMap[englishDay] || englishDay;
  }

  getAbs(value: number | null): number {
    return Math.abs(value || 0);
  }

  onMonthChange(event: any) {
    this.loadData();
  }

  exportPdf() {
    if (this.isDownloadingPdf) return;
    
    this.isDownloadingPdf = true;
    this.cdr.detectChanges();

    this.reportApi.getMonthlySimplePdf(this.selectedYear, this.selectedMonth).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informe_Mensual_Simple_${this.selectedMonth}_${this.selectedYear}.pdf`;
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
