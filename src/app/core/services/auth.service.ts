import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError, BehaviorSubject } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;
  
  // Use a signal for reactive authentication state
  isLoggedIn = signal<boolean>(false);
  
  // Current user signal
  currentUser = signal<User | null>(null);

  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  isInitialized$ = this.isInitializedSubject.asObservable();

  constructor() {
    this.reconstructSession();
  }

  private reconstructSession() {
    const token = this.getToken();
    if (token) {
      this.getMe().subscribe({
        next: (user) => {
          this.isLoggedIn.set(true);
          this.currentUser.set({
            ...user,
            accessToken: token
          });
          this.isInitializedSubject.next(true);
        },
        error: () => {
          this.logout();
          this.isInitializedSubject.next(true);
        }
      });
    } else {
      this.isInitializedSubject.next(true);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<any>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  loginAsGuest(): Observable<User> {
    return this.http.post<any>(`${this.baseUrl}/guest`, {}).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  private handleAuthSuccess(res: any) {
    const user: User = {
      name: res.displayName,
      displayName: res.displayName,
      role: res.role as UserRole,
      accessToken: res.accessToken,
      professionalId: res.professionalId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.displayName)}&background=EEF2FF&color=4338CA&bold=true&size=128`
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', res.accessToken);
    }
    
    this.isLoggedIn.set(true);
    this.currentUser.set(user);
    this.router.navigate(['/panel']);
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
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
