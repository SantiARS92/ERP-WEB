import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { AuthService } from './core/services/auth.service';
import { SettingsStore } from './core/state/settings.store';
import { ThemeService } from './core/services/theme.service';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAppInitializer(() => inject(AuthService).reconstructSession()),
    provideAppInitializer(() => inject(SettingsStore).load()),
    provideAppInitializer(() => {
      inject(ThemeService).initializeTheme();
    }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor, timeoutInterceptor, errorInterceptor]))
  ]
};
