import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { SettingsStore } from '../../core/state/settings.store';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styles: ``,
})
export class Sidebar {
  private settingsStore = inject(SettingsStore);
  private router = inject(Router);
  authService = inject(AuthService); // Public for template use
  
  settings = this.settingsStore.settings;
  readonly canManage = computed(() => this.authService.hasRole([UserRole.ADMIN, UserRole.PROFESSIONAL]));
  readonly isAdmin = computed(() => this.authService.hasRole([UserRole.ADMIN]));
  readonly roleLabel = computed(() => {
    const role = this.authService.currentUser()?.role;
    if (role === UserRole.ADMIN) return 'Administrador';
    if (role === UserRole.PROFESSIONAL) return 'Profesional';
    return 'Invitado';
  });

  readonly isUserMenuOpen = signal(false);

  toggleUserMenu() {
    this.isUserMenuOpen.update(v => !v);
  }

  closeUserMenu() {
    this.isUserMenuOpen.set(false);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
