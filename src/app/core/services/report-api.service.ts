import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  MonthlySimpleReport, 
  MonthlyDetailedReport, 
  QuarterlyDetailedReport, 
  AnnualConsolidatedReport, 
  RankingResponse 
} from '../models/report.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  getMonthlySimple(year: number, month: number): Observable<MonthlySimpleReport> {
    const params = new HttpParams({ fromObject: { year: String(year), month: String(month) } });
    return this.http.get<MonthlySimpleReport>(`${this.apiUrl}/monthly/simple`, { params });
  }

  getMonthlyDetailed(year: number, month: number): Observable<MonthlyDetailedReport> {
    const params = new HttpParams({ fromObject: { year: String(year), month: String(month) } });
    return this.http.get<MonthlyDetailedReport>(`${this.apiUrl}/monthly/detailed`, { params });
  }

  getMonthlyDetailedPdf(year: number, month: number): Observable<Blob> {
    const params = new HttpParams({ fromObject: { year: String(year), month: String(month) } });
    return this.http.get(`${this.apiUrl}/monthly/detailed/pdf`, { params, responseType: 'blob' });
  }

  getQuarterlyDetailed(year: number, quarter: number): Observable<QuarterlyDetailedReport> {
    const params = new HttpParams({ fromObject: { year: String(year), quarter: String(quarter) } });
    return this.http.get<QuarterlyDetailedReport>(`${this.apiUrl}/quarterly/detailed`, { params });
  }

  getQuarterlyDetailedPdf(year: number, quarter: number): Observable<Blob> {
    const params = new HttpParams({ fromObject: { year: String(year), quarter: String(quarter) } });
    return this.http.get(`${this.apiUrl}/quarterly/detailed/pdf`, { params, responseType: 'blob' });
  }

  getAnnualConsolidated(year: number): Observable<AnnualConsolidatedReport> {
    const params = new HttpParams({ fromObject: { year: String(year) } });
    return this.http.get<AnnualConsolidatedReport>(`${this.apiUrl}/annual/consolidated`, { params });
  }

  getAnnualConsolidatedPdf(year: number): Observable<Blob> {
    const params = new HttpParams({ fromObject: { year: String(year) } });
    return this.http.get(`${this.apiUrl}/annual/consolidated/pdf`, { params, responseType: 'blob' });
  }

  getRanking(type: 'SERVICE' | 'PRODUCT', year: number, month: number, page = 0, size = 10): Observable<RankingResponse> {
    const params = new HttpParams({ fromObject: {
      type,
      year: String(year),
      month: String(month),
      page: String(page),
      size: String(size)
    }});
    return this.http.get<RankingResponse>(`${this.apiUrl}/ranking`, { params });
  }

  getMonthlySimplePdf(year: number, month: number): Observable<Blob> {
    const params = new HttpParams({ fromObject: { year: String(year), month: String(month) } });
    return this.http.get(`${this.apiUrl}/monthly/simple/pdf`, { params, responseType: 'blob' });
  }

  getRankingPdf(type: 'SERVICE' | 'PRODUCT', year: number, month: number): Observable<Blob> {
    const params = new HttpParams({ fromObject: { type, year: String(year), month: String(month) } });
    return this.http.get(`${this.apiUrl}/ranking/pdf`, { params, responseType: 'blob' });
  }
}
