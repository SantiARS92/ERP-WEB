import { inject, Injectable, effect, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type ThemeMode = 'light' | 'dark';
export type PrimaryColor = 'blue' | 'rose' | 'emerald' | 'indigo' | 'amber' | 'purple';

export interface ColorPalette {
  primary: string;
  hover: string;
  light: string;
  shadow: string;
}

const PALETTES: Record<PrimaryColor, ColorPalette> = {
  blue: { primary: '#3b82f6', hover: '#2563eb', light: '#eff6ff', shadow: 'rgba(59, 130, 246, 0.2)' },
  rose: { primary: '#f43f5e', hover: '#e11d48', light: '#fff1f2', shadow: 'rgba(244, 63, 94, 0.2)' },
  emerald: { primary: '#10b981', hover: '#059669', light: '#ecfdf5', shadow: 'rgba(16, 185, 129, 0.2)' },
  indigo: { primary: '#6366f1', hover: '#4f46e5', light: '#eef2ff', shadow: 'rgba(99, 102, 241, 0.2)' },
  amber: { primary: '#f59e0b', hover: '#d97706', light: '#fffbeb', shadow: 'rgba(245, 158, 11, 0.2)' },
  purple: { primary: '#a855f7', hover: '#9333ea', light: '#faf5ff', shadow: 'rgba(168, 85, 247, 0.2)' }
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private storage = inject(StorageService);
  readonly themeMode = signal<ThemeMode>(this.storage.getThemeMode() ?? 'light');
  readonly primaryColor = signal<PrimaryColor>(this.storage.getPrimaryColor() ?? 'blue');

  constructor() {
    effect(() => {
      this.applyTheme(this.themeMode());
      this.storage.setThemeMode(this.themeMode());
    });

    effect(() => {
      this.applyColor(this.primaryColor());
      this.storage.setPrimaryColor(this.primaryColor());
    });
  }

  setTheme(mode: ThemeMode) {
    this.themeMode.set(mode);
  }

  setPrimaryColor(color: PrimaryColor) {
    this.primaryColor.set(color);
  }

  initializeTheme() {
    this.applyTheme(this.themeMode());
    this.applyColor(this.primaryColor());
  }

  private applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  private applyColor(color: PrimaryColor) {
    const root = document.documentElement;
    const palette = PALETTES[color];
    
    root.style.setProperty('--primary-color', palette.primary);
    root.style.setProperty('--primary-hover', palette.hover);
    root.style.setProperty('--primary-light', palette.light);
    root.style.setProperty('--primary-shadow', palette.shadow);
  }
}
