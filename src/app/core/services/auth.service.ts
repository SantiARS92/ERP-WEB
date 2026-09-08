import { computed, Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, map, of, tap, throwError } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

interface AuthResponse {
  displayName: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  professionalId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  
  // Use a signal for reactive authentication state
  readonly isLoggedIn = signal<boolean>(false);
  
  // Current user signal
  readonly currentUser = signal<User | null>(null);
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly isProfessional = computed(() => this.currentUser()?.role === UserRole.PROFESSIONAL);
  readonly isGuest = computed(() => this.currentUser()?.role === UserRole.GUEST);
  readonly canManage = computed(() => this.isAdmin() || this.isProfessional());

  readonly isInitialized = signal(false);

  async reconstructSession(): Promise<void> {
    const token = this.getToken();
    if (token) {
      const user = await firstValueFrom(
        this.getMe().pipe(
          map((currentUser) => ({ ...currentUser, accessToken: token })),
          catchError(() => {
            this.clearSession();
            return of(null);
          })
        )
      );

      if (user) {
        this.isLoggedIn.set(true);
        this.currentUser.set(user);
      }
    }

    this.isInitialized.set(true);
  }

  getToken(): string | null {
    return this.storage.getAccessToken();
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  loginAsGuest(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/guest`, {}).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  private handleAuthSuccess(res: AuthResponse) {
    const user: User = {
      name: res.displayName,
      displayName: res.displayName,
      role: res.role as UserRole,
      accessToken: res.accessToken,
      professionalId: res.professionalId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.displayName)}&background=EEF2FF&color=4338CA&bold=true&size=128`
    };

    this.storage.setAccessToken(res.accessToken);
    this.storage.setRefreshToken(res.refreshToken);

    this.isLoggedIn.set(true);
    this.currentUser.set(user);
    this.isInitialized.set(true);
  }

  logout() {
    this.clearSession();
    this.isInitialized.set(true);
    this.router.navigate(['/login']);
  }

  private clearSession() {
    this.storage.clearAccessToken();
    this.storage.clearRefreshToken();
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
  }
  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  /**
   * Check if the current user has at least one of the required roles
   */
  hasRole(allowedRoles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }
}
