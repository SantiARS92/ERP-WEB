import {Injectable, effect, inject } from '@angular/core';
import {SettingsStore } from '../state/settings.store';

@Injectable({
  providedIn: 'root',
})
export class FaviconService {
  private settingsStore = inject(SettingsStore);
  private readonly defaultFavicon = 'favicon.ico';

  constructor() {
    effect(() => {
        const logo = this.settingsStore.settings()?.businessLogo;
        this.setFavicon(logo || this.defaultFavicon);
    });
  }

  private setFavicon(href: string) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }
}