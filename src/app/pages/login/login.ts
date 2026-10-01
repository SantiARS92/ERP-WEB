import { Component, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { SettingsStore } from '../../core/state/settings.store';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  authService = inject(AuthService);
  settingsStore = inject(SettingsStore);
  private router = inject(Router);
  
  readonly settings = this.settingsStore.settings;

  username = '';
  password = '';
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal('');

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.error.set('Por favor, ingresa tu usuario y contraseña');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.settingsStore.load();
        this.router.navigate(['/panel']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Credenciales incorrectas');
        this.isLoading.set(false);
      }
    });
  }

  loginAsGuest() {
    this.authService.loginAsGuest().subscribe({
      next: () => this.router.navigate(['/panel']),
    });
  }
}
