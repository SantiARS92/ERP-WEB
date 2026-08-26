import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import { BusinessSettings } from '../models/settings.model';
import { environment } from '../../../environments/environment';
import { HttpContext } from '@angular/common/http';
import { silentError } from '../http/http-contexts';

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/settings`;

  // Reactive state for global business settings
  private settingsSignal = signal<BusinessSettings | null>(null);
  public settings = this.settingsSignal.asReadonly();

  async loadSettings(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<BusinessSettings>(this.apiUrl, { context: new HttpContext().set(silentError, true) }).pipe(
        catchError((err) => {
          console.error('Error loading business settings:', err);
          return of(null);
        })
      )
    );

    const fallback = this.applyLocalStorageFallback(data ?? this.emptySettings());
    if (data || fallback.businessName || fallback.businessLogo) {
      this.settingsSignal.set(fallback);
    }
  }

  getSettings(): Observable<BusinessSettings> {
    return this.http.get<BusinessSettings>(this.apiUrl).pipe(
      tap(data => {
        const enriched = this.applyLocalStorageFallback(data);
        this.settingsSignal.set(enriched);
      })
    );
  }

  updateSettings(settings: BusinessSettings): Observable<BusinessSettings> {
    // Save to localStorage before sending to backend
    this.saveToLocalStorage(settings);
    return this.http.put<BusinessSettings>(this.apiUrl, settings).pipe(
      tap(data => {
        const enriched = this.applyLocalStorageFallback(data);
        this.settingsSignal.set(enriched);
      })
    );
  }

  private applyLocalStorageFallback(apiData: BusinessSettings): BusinessSettings {
    const localName = localStorage.getItem('fallback_businessName');
    const localLogo = localStorage.getItem('fallback_businessLogo');
    
    return {
      ...apiData,
      businessName: apiData.businessName || localName || '',
      businessLogo: apiData.businessLogo || localLogo || ''
    };
  }

  private emptySettings(): BusinessSettings {
    return {
      businessName: '',
      phone: '',
      address: '',
      contactEmail: '',
      onlineBookingEnabled: false,
      defaultAppointmentDurationMinutes: 0,
      minimumAdvanceMinutes: 0,
      maximumAdvanceDays: 0,
      freeCancellationHours: 0,
      cancellationPolicy: '',
      openingHours: [],
      specialClosures: [],
      businessLogo: '',
    };
  }

  private saveToLocalStorage(settings: BusinessSettings) {
    if (settings.businessName) localStorage.setItem('fallback_businessName', settings.businessName);
    if (settings.businessLogo) localStorage.setItem('fallback_businessLogo', settings.businessLogo);
  }

  // Helper for direct updates if needed
  updateLocalName(name: string) {
    localStorage.setItem('fallback_businessName', name);
    const current = this.settingsSignal();
    if (current) {
      this.settingsSignal.set({ ...current, businessName: name });
    }
  }
}
