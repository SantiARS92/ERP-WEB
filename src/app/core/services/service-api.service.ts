import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Service, ServicePage } from '../models/service.model';
import { environment } from '../../../environments/environment';

export interface ServiceFilters {
  search?: string;
  active?: boolean;
  categoryId?: number;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/services`;

  getServices(filters: ServiceFilters = {}): Observable<ServicePage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.active !== undefined) params = params.set('active', String(filters.active));
    if (filters.categoryId !== undefined) params = params.set('categoryId', String(filters.categoryId));
    if (filters.page !== undefined) params = params.set('page', String(filters.page));
    if (filters.size !== undefined) params = params.set('size', String(filters.size));
    return this.http.get<ServicePage>(this.apiUrl, { params });
  }

  getServiceById(id: number): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/${id}`);
  }

  createService(service: Service): Observable<Service> {
    return this.http.post<Service>(this.apiUrl, service);
  }

  updateService(id: number, service: Service): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/${id}`, service);
  }

  deleteService(id: number, context?: HttpContext): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { context });
  }
}
