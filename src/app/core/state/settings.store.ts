import { HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of, tap, throwError } from 'rxjs';
import { silentError } from '../http/http-contexts';
import { BusinessSettings } from '../models/settings.model';
import { SettingsApiService } from '../services/settings-api.service';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsStore {
  private settingsApi = inject(SettingsApiService);
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private readonly settingsSignal = signal<BusinessSettings | null>(null);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<unknown | null>(null);

  readonly settings = this.settingsSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  async load(): Promise<void> {
    if (!this.auth.isAdmin()) {
      const fallback = this.applyLocalStorageFallback(this.emptySettings());
      if (fallback.businessName || fallback.businessLogo) {
        this.settingsSignal.set(fallback);
      }
      return;
    }
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    const data = await firstValueFrom(this.settingsApi.getSettings(new HttpContext().set(silentError, true)).pipe(
      catchError((error) => {
        this.errorSignal.set(error);
        return of(null);
      }),
    ));

    const fallback = this.applyLocalStorageFallback(data ?? this.emptySettings());
    if (data || fallback.businessName || fallback.businessLogo) {
      this.settingsSignal.set(fallback);
    }

    this.isLoadingSignal.set(false);
  }

  updateSettings(settings: BusinessSettings) {
    this.persistFallback(settings);
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.settingsApi.updateSettings(settings).pipe(
      map((data) => this.applyLocalStorageFallback(data)),
      tap((data) => {
        this.settingsSignal.set(data);
        this.isLoadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  updateLocalName(name: string): void {
    this.storage.setFallbackBusinessName(name);
    this.patchSettings({ businessName: name });
  }

  updateLocalLogo(logo: string): void {
    this.storage.setFallbackBusinessLogo(logo);
    this.patchSettings({ businessLogo: logo });
  }

  private patchSettings(patch: Partial<BusinessSettings>): void {
    const current = this.settingsSignal() ?? this.emptySettings();
    this.settingsSignal.set({ ...current, ...patch });
  }

  private applyLocalStorageFallback(apiData: BusinessSettings): BusinessSettings {
    const localName = this.storage.getFallbackBusinessName();
    const localLogo = this.storage.getFallbackBusinessLogo();

    return {
      ...apiData,
      businessName: apiData.businessName || localName || '',
      businessLogo: apiData.businessLogo || localLogo || '',
    };
  }

  private persistFallback(settings: BusinessSettings): void {
    this.storage.setFallbackBusinessName(settings.businessName || null);
    this.storage.setFallbackBusinessLogo(settings.businessLogo || null);
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
}
