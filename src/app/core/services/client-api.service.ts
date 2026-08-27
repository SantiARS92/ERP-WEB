import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, ClientPage } from '../models/client.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientApiService {
  private readonly baseUrl = `${environment.apiUrl}/clients`;
  private http = inject(HttpClient);
  /**
   * GET /api/clients  — paginated list with optional search
   */
  getClients(filters: { search?: string; page?: number; size?: number } = {}): Observable<ClientPage> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    return this.http.get<ClientPage>(this.baseUrl, { params });
  }

  /**
   * GET /api/clients/{id}
   */
  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`);
  }

  /**
   * POST /api/clients
   */
  createClient(client: Omit<Client, 'id'>): Observable<Client> {
    return this.http.post<Client>(this.baseUrl, client);
  }

  /**
   * PUT /api/clients/{id}
   */
  updateClient(id: number, client: Omit<Client, 'id'>): Observable<Client> {
    return this.http.put<Client>(`${this.baseUrl}/${id}`, client);
  }

  /**
   * DELETE /api/clients/{id}  — returns 204 No Content
   */
  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
