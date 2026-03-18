import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Service, ServicePage } from '../models/service.model';

@Injectable({
  providedIn: 'root'
})
export class ServiceApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/services';

  getServices(filters: any = {}): Observable<ServicePage> {
    // Clean up empty filters
    const params = Object.keys(filters)
      .filter(key => filters[key] !== null && filters[key] !== undefined && filters[key] !== '')
      .reduce((obj, key) => {
        obj[key] = filters[key];
        return obj;
      }, {} as any);

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

  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
