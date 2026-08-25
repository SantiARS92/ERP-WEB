import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportApiService } from '../../../core/services/report-api.service';
import { MonthlySimpleReport } from '../../../core/models/report.model';

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
        this.reportData = null;
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
