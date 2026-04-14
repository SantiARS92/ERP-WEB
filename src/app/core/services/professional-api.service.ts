import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Professional } from '../models/professional.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfessionalApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/professionals`;

  getProfessionals(active?: boolean): Observable<Professional[]> {
    let params = new HttpParams();
    if (active !== undefined) {
      params = params.set('active', active.toString());
    }
    return this.http.get<Professional[]>(this.apiUrl, { params });
  }

  getProfessionalById(id: number): Observable<Professional> {
    return this.http.get<Professional>(`${this.apiUrl}/${id}`);
  }

  createProfessional(p: Partial<Professional> & { accessPassword: string }): Observable<Professional> {
    return this.http.post<Professional>(this.apiUrl, p);
  }

  updateProfessional(id: number, p: Partial<Professional> & { accessPassword?: string }): Observable<Professional> {
    return this.http.put<Professional>(`${this.apiUrl}/${id}`, p);
  }

  deleteProfessional(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
