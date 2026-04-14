import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { ExpenseRequest, ExpenseResponse, ExpensePage } from '../models/expense.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExpenseApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/expenses`;
  private http = inject(HttpClient);
  private readonly DEFAULT_TIMEOUT = 10000;

  createExpense(expense: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.post<ExpenseResponse>(this.baseUrl, expense).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getExpenses(filters: { search?: string; category?: string; fromDate?: string; toDate?: string; page?: number; size?: number } = {}): Observable<ExpensePage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.category) params = params.set('category', filters.category);
    
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    return this.http.get<ExpensePage>(this.baseUrl, { params }).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getRecentExpenses(limit: number = 5): Observable<ExpenseResponse[]> {
    let params = new HttpParams();
    params = params.set('limit', limit.toString());
    return this.http.get<ExpenseResponse[]>(`${this.baseUrl}/recent`, { params }).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getExpenseById(id: number): Observable<ExpenseResponse> {
    return this.http.get<ExpenseResponse>(`${this.baseUrl}/${id}`).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  updateExpense(id: number, expense: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.put<ExpenseResponse>(`${this.baseUrl}/${id}`, expense).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  exportExpensesToPdf(filters: { search?: string; fromDate?: string; toDate?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get(`${this.baseUrl}/export/pdf`, { params, responseType: 'blob' }).pipe(timeout(30000));
  }

  getSuggestions(query: string, category?: string, limit: number = 5): Observable<string[]> {
    let params = new HttpParams();
    params = params.set('query', query);
    if (category) {
      params = params.set('category', category);
    }
    params = params.set('limit', limit.toString());
    return this.http.get<string[]>(`${this.baseUrl}/suggestions`, { params }).pipe(timeout(5000));
  }
}
