import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { BusinessSettings } from '../models/settings.model';
import { environment } from '../../../environments/environment';
import { HttpContext } from '@angular/common/http';
import { silentError } from '../interceptors/error.interceptor';

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/settings`;

  // Reactive state for global business settings
  private settingsSignal = signal<BusinessSettings | null>(null);
  public settings = this.settingsSignal.asReadonly();

  constructor() {
    this.loadSettings();
  }

  loadSettings(): void {
    this.http.get<BusinessSettings>(this.apiUrl, { context: new HttpContext().set(silentError, true) }).subscribe({
      next: (data) => {
        // Fallback: Restore from localStorage if backend returned empty but we have a local copy
        const enriched = this.applyLocalStorageFallback(data);
      
        this.settingsSignal.set(enriched);
      },
      error: (err) => {
        console.error('Error loading business settings:', err);
        // Even on error, try to load from local storage
        const fallback = this.applyLocalStorageFallback({} as any);
        if (fallback.businessName) this.settingsSignal.set(fallback);
      }
    });
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
