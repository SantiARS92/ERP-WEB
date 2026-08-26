import { Component, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { Professional } from '../../core/models/professional.model';
import { HttpContext } from '@angular/common/http';
import { silentError } from '../../core/http/http-contexts';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  authService = inject(AuthService);
  settingsApi = inject(SettingsApiService);
  professionalApi = inject(ProfessionalApiService);
  
  settings = this.settingsApi.settings;
  
  professionals = signal<Professional[]>([]);

  username = '';
  password = '';
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal('');

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
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.error.set(err.error?.message || 'Credenciales incorrectas');
        this.isLoading.set(false);
      }
    });
  }

  loginAsGuest() {
    this.authService.loginAsGuest().subscribe();
  }
}
