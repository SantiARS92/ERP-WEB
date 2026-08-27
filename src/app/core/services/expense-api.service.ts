import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExpenseRequest, ExpenseResponse, ExpensePage } from '../models/expense.model';
import { environment } from '../../../environments/environment';
import { requestTimeout } from '../http/http-contexts';

@Injectable({
  providedIn: 'root'
})
export class ExpenseApiService {
  private readonly baseUrl = `${environment.apiUrl}/expenses`;
  private http = inject(HttpClient);
  createExpense(expense: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.post<ExpenseResponse>(this.baseUrl, expense);
  }

  getExpenses(filters: { search?: string; category?: string; fromDate?: string; toDate?: string; page?: number; size?: number } = {}): Observable<ExpensePage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.category) params = params.set('category', filters.category);
    
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    return this.http.get<ExpensePage>(this.baseUrl, { params });
  }

  getRecentExpenses(limit = 5): Observable<ExpenseResponse[]> {
    let params = new HttpParams();
    params = params.set('limit', limit.toString());
    return this.http.get<ExpenseResponse[]>(`${this.baseUrl}/recent`, { params });
  }

  getExpenseById(id: number): Observable<ExpenseResponse> {
    return this.http.get<ExpenseResponse>(`${this.baseUrl}/${id}`);
  }

  updateExpense(id: number, expense: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.put<ExpenseResponse>(`${this.baseUrl}/${id}`, expense);
  }

  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  exportExpensesToPdf(filters: { search?: string; fromDate?: string; toDate?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get(`${this.baseUrl}/export/pdf`, {
      params,
      responseType: 'blob',
      context: new HttpContext().set(requestTimeout, 30000),
    });
  }

  getSuggestions(query: string, category?: string, limit = 5): Observable<string[]> {
    let params = new HttpParams();
    params = params.set('query', query);
    if (category) {
      params = params.set('category', category);
    }
    params = params.set('limit', limit.toString());
    return this.http.get<string[]>(`${this.baseUrl}/suggestions`, {
      params,
      context: new HttpContext().set(requestTimeout, 5000),
    });
  }
}
