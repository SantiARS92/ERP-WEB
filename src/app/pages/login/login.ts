import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { UserRole } from '../../core/models/user.model';
import { Professional } from '../../core/models/professional.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  authService = inject(AuthService);
  settingsApi = inject(SettingsApiService);
  professionalApi = inject(ProfessionalApiService);
  
  settings = this.settingsApi.settings;
  UserRole = UserRole;
  
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
    this.professionalApi.getProfessionals(true).subscribe({
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

    // Simulate backend call
    setTimeout(() => {
      this.authService.login(this.username, this.password).subscribe({
        next: () => this.isLoading.set(false),
        error: (err) => {
          this.error.set(err.error?.message || 'Credenciales incorrectas');
          this.isLoading.set(false);
        }
      });
    }, 1000);
  }

  loginWithRole(role: UserRole, username?: string) {
    if (role === UserRole.ADMIN) {
      this.authService.login('admin', '1234').subscribe();
    } else if (role === UserRole.PROFESSIONAL) {
      this.authService.login(username || 'Elena', '1234').subscribe();
    }
  }

  loginAsGuest() {
    this.authService.loginAsGuest().subscribe();
  }
}
