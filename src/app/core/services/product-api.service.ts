import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, ProductPage } from '../models/product.model';
import { environment } from '../../../environments/environment';
import { requestTimeout } from '../http/http-contexts';

@Injectable({
  providedIn: 'root'
})
export class ProductApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/inventory/products`;
  private http = inject(HttpClient);
  getProducts(filters: { search?: string; categoryIds?: string; page?: number; size?: number } = {}): Observable<ProductPage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.categoryIds) params = params.set('categoryIds', filters.categoryIds);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    
    return this.http.get<ProductPage>(this.baseUrl, { params });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  updateProduct(id: number, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  exportProductsToPdf(filters: { search?: string; categoryIds?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.categoryIds) params = params.set('categoryIds', filters.categoryIds);

    return this.http.get(`${this.baseUrl}/export/pdf`, {
      params,
      responseType: 'blob',
      context: new HttpContext().set(requestTimeout, 30000),
    });
  }
}
