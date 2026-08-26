import { Injectable } from '@angular/core';
import { PrimaryColor, ThemeMode } from './theme.service';

const STORAGE_KEYS = {
  accessToken: 'accessToken',
  themeMode: 'theme-mode',
  primaryColor: 'primary-color',
  fallbackBusinessName: 'fallback_businessName',
  fallbackBusinessLogo: 'fallback_businessLogo',
} as const;

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  getAccessToken(): string | null {
    return this.getItem(STORAGE_KEYS.accessToken);
  }

  setAccessToken(token: string): void {
    this.setItem(STORAGE_KEYS.accessToken, token);
  }

  clearAccessToken(): void {
    this.removeItem(STORAGE_KEYS.accessToken);
  }

  getThemeMode(): ThemeMode | null {
    return this.getItem(STORAGE_KEYS.themeMode) as ThemeMode | null;
  }

  setThemeMode(mode: ThemeMode): void {
    this.setItem(STORAGE_KEYS.themeMode, mode);
  }

  getPrimaryColor(): PrimaryColor | null {
    return this.getItem(STORAGE_KEYS.primaryColor) as PrimaryColor | null;
  }

  setPrimaryColor(color: PrimaryColor): void {
    this.setItem(STORAGE_KEYS.primaryColor, color);
  }

  getFallbackBusinessName(): string | null {
    return this.getItem(STORAGE_KEYS.fallbackBusinessName);
  }

  setFallbackBusinessName(name: string | null): void {
    this.setItem(STORAGE_KEYS.fallbackBusinessName, name);
  }

  getFallbackBusinessLogo(): string | null {
    return this.getItem(STORAGE_KEYS.fallbackBusinessLogo);
  }

  setFallbackBusinessLogo(logo: string | null): void {
    this.setItem(STORAGE_KEYS.fallbackBusinessLogo, logo);
  }

  private getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setItem(key: string, value: string | null): void {
    try {
      if (!value) {
        localStorage.removeItem(key);
        return;
      }

      localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures; the app should keep working without persistence.
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage failures; the app should keep working without persistence.
    }
  }
}
