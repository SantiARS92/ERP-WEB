import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styles: ``,
})
export class Sidebar {
  private settingsApi = inject(SettingsApiService);
  authService = inject(AuthService); // Public for template use
  
  settings = this.settingsApi.settings;
  UserRole = UserRole; // Expose enum to template

  isUserMenuOpen = signal(false);

  toggleUserMenu() {
    this.isUserMenuOpen.update(v => !v);
  }

  closeUserMenu() {
    this.isUserMenuOpen.set(false);
  }

  logout() {
    this.authService.logout();
  }
}
