import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BusinessSettings } from '../models/settings.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/settings`;

  getSettings(context?: HttpContext): Observable<BusinessSettings> {
    return this.http.get<BusinessSettings>(this.apiUrl, context ? { context } : undefined);
  }

  updateSettings(settings: BusinessSettings): Observable<BusinessSettings> {
    return this.http.put<BusinessSettings>(this.apiUrl, settings);
  }
}
