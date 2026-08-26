import { Component, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { Professional } from '../../core/models/professional.model';
import { HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { silentError } from '../../core/http/http-contexts';
import { SettingsStore } from '../../core/state/settings.store';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  authService = inject(AuthService);
  settingsStore = inject(SettingsStore);
  professionalApi = inject(ProfessionalApiService);
  private router = inject(Router);
  
  readonly settings = this.settingsStore.settings;
  
  readonly professionals = signal<Professional[]>([]);

  username = '';
  password = '';
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal('');

  ngOnInit() {
    this.loadProfessionals();
  }

  loadProfessionals() {
    this.professionalApi.getProfessionals(true, new HttpContext().set(silentError, true)).subscribe({
      next: (data) => this.professionals.set(data),
      error: () => console.error('Error loading professionals for login')
    });
  }

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
