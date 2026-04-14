import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { SaleResponse, SaleRequest, SalePage } from '../models/sale.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SaleApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/sales`;
  private http = inject(HttpClient);
  private readonly DEFAULT_TIMEOUT = 10000;

  createSale(sale: SaleRequest): Observable<SaleResponse> {
    return this.http.post<SaleResponse>(this.baseUrl, sale).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getSales(filters: { search?: string; fromDate?: string; toDate?: string; page?: number; size?: number } = {}): Observable<SalePage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    
    return this.http.get<SalePage>(this.baseUrl, { params }).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getSaleById(id: number): Observable<SaleResponse> {
    return this.http.get<SaleResponse>(`${this.baseUrl}/${id}`).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getRecentSales(days?: number, limit?: number): Observable<SaleResponse[]> {
    let params = new HttpParams();
    if (days !== undefined) params = params.set('days', days.toString());
    if (limit !== undefined) params = params.set('limit', limit.toString());
    return this.http.get<SaleResponse[]>(`${this.baseUrl}/recent`, { params }).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  updateSale(id: number, sale: SaleRequest): Observable<SaleResponse> {
    return this.http.put<SaleResponse>(`${this.baseUrl}/${id}`, sale).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  deleteSale(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  exportSalesToPdf(filters: { search?: string; fromDate?: string; toDate?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);

    return this.http.get(`${this.baseUrl}/export/pdf`, { 
      params, 
      responseType: 'blob' 
    }).pipe(timeout(30000)); // PDF generation might take a bit longer
  }
}
