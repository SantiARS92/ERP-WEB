import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout, of } from 'rxjs';
import { Product, ProductPage } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/inventory/products`;
  private http = inject(HttpClient);
  private readonly DEFAULT_TIMEOUT = 10000;

  getProducts(filters: { search?: string; categoryIds?: string; page?: number; size?: number } = {}): Observable<ProductPage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.categoryIds) params = params.set('categoryIds', filters.categoryIds);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    
    return this.http.get<ProductPage>(this.baseUrl, { params }).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  updateProduct(id: number, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(timeout(this.DEFAULT_TIMEOUT));
  }

  exportProductsToPdf(filters: { search?: string; categoryIds?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.categoryIds) params = params.set('categoryIds', filters.categoryIds);

    return this.http.get(`${this.baseUrl}/export/pdf`, { 
      params, 
      responseType: 'blob' 
    }).pipe(timeout(30000));
  }
}
