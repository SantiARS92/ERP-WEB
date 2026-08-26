import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ThemeService, PrimaryColor, ThemeMode } from '../../core/services/theme.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { BusinessSettings, DayOfWeek, OpeningHour, SpecialClosure } from '../../core/models/settings.model';
import { Professional } from '../../core/models/professional.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-configuracion',
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.html',
  styles: `
    .ios-toggle {
      appearance: none;
      width: 44px;
      height: 24px;
      background-color: #e2e8f0; /* slate-200 */
      border-radius: 9999px;
      position: relative;
      cursor: pointer;
      outline: none;
      transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ios-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ios-toggle:checked {
      background-color: var(--primary-color);
    }
    .ios-toggle:checked::after {
      transform: translateX(20px);
    }
  `
})
export class Configuracion implements OnInit, OnDestroy {
  // Accordion state
  expandedSection: string | null = 'perfil';
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();
  private router = inject(Router);
  themeService = inject(ThemeService);
  private settingsApi = inject(SettingsApiService);
  private professionalApi = inject(ProfessionalApiService);
  authService = inject(AuthService);
  UserRole = UserRole;
  private notification = inject(NotificationService);

  availableColors: { name: PrimaryColor, label: string, hex: string }[] = [
    { name: 'blue', label: 'Azul', hex: '#3b82f6' },
    { name: 'indigo', label: 'Índigo', hex: '#6366f1' },
    { name: 'purple', label: 'Púrpura', hex: '#a855f7' },
    { name: 'rose', label: 'Rosa', hex: '#f43f5e' },
    { name: 'emerald', label: 'Esmeralda', hex: '#10b981' },
    { name: 'amber', label: 'Ámbar', hex: '#f59e0b' }
  ];

  // --- Real State ---
  settings: BusinessSettings = {
    businessName: '',
    phone: '',
    address: '',
    contactEmail: '',
    onlineBookingEnabled: true,
    defaultAppointmentDurationMinutes: 30,
    minimumAdvanceMinutes: 120,
    maximumAdvanceDays: 90,
    freeCancellationHours: 24,
    cancellationPolicy: '',
    openingHours: [],
    specialClosures: [],
    businessLogo: '',
    cip: ''
  };

  professionals: Professional[] = [];
  isSubmitting = false;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private saveResetTimer: any = null;

  // For adding/editing professional (Modal mini-state)
  isProfessionalModalOpen = false;
  editingProfessional: Professional & { accessPassword?: string } = { fullName: '', specialty: '', active: true, accessPassword: '' };

  dayNamesMap: Record<DayOfWeek, string> = {
    MONDAY: 'Lunes',
    TUESDAY: 'Martes',
    WEDNESDAY: 'Miércoles',
    THURSDAY: 'Jueves',
    FRIDAY: 'Viernes',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo'
  };

  orderedDays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  ngOnInit(): void {
    this.loadAll();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupAutoSave() {
    this.autoSave$.pipe(
      debounceTime(800),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.triggerSave();
    });
  }

  onFieldChange() {
    this.autoSave$.next();
  }

  loadAll() {
    this.settingsApi.getSettings().subscribe({
      next: (data) => {
        // Deep-merge backend response over the current defaults so no field gets wiped by null
        this.settings = {
          ...this.settings,        // start with conservative defaults
          ...data,                 // overwrite with whatever backend returned
          // Keep local logo if the backend didn't persist it (Base64 too large for some backends)
          businessLogo: data.businessLogo || localStorage.getItem('fallback_businessLogo') || '',
          // Ensure arrays are never null
          openingHours: data.openingHours?.length ? data.openingHours : this.settings.openingHours,
          specialClosures: data.specialClosures ?? [],
        };
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        // Restore from localStorage on API failure
        const savedName = localStorage.getItem('fallback_businessName');
        const savedLogo = localStorage.getItem('fallback_businessLogo');
        if (savedName) this.settings.businessName = savedName;
        if (savedLogo) this.settings.businessLogo = savedLogo;
      }
    });
    this.professionalApi.getProfessionals().subscribe({
      next: (data) => { this.professionals = data; },
      error: (err) => console.error('Error loading professionals:', err)
    });
  }

  // Toggle accordion
  toggleSection(section: string) {
    this.expandedSection = this.expandedSection === section ? null : section;
  }

  // --- Actions ---

  triggerSave() {
    if (this.saveResetTimer) clearTimeout(this.saveResetTimer);
    this.saveStatus = 'saving';
    this.isSubmitting = true;
    this.settingsApi.updateSettings(this.settings).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.saveStatus = 'saved';
        this.saveResetTimer = setTimeout(() => { this.saveStatus = 'idle'; }, 3000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.saveStatus = 'error';
        this.saveResetTimer = setTimeout(() => { this.saveStatus = 'idle'; }, 5000);
        console.error('Error auto-saving settings:', err);
      }
    });
  }

  saveAllSettings() {
    this.triggerSave();
    this.notification.success('Configuración guardada correctamente.', '¡Guardado!');
  }

  // Logo file upload (Base64)
  onLogoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.notification.warning('La imagen no puede superar 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.settings.businessLogo = e.target?.result as string;
      localStorage.setItem('fallback_businessLogo', this.settings.businessLogo);
      this.onFieldChange(); // triggers auto-save
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.settings.businessLogo = '';
    this.onFieldChange();
  }

  // Management for Opening Hours
  getOpeningHourForDay(day: DayOfWeek): OpeningHour {
    let oh = this.settings.openingHours.find(h => h.dayOfWeek === day);
    if (!oh) {
      oh = { dayOfWeek: day, enabled: false, openingTime: null, closingTime: null };
      this.settings.openingHours.push(oh);
    }
    return oh;
  }

  toggleDay(oh: OpeningHour) {
    oh.enabled = !oh.enabled;
    if (!oh.enabled) {
      oh.openingTime = null;
      oh.closingTime = null;
    } else {
      oh.openingTime = '09:00';
      oh.closingTime = '18:00';
    }
    this.onFieldChange();
  }

  // Management for Special Closures
  addClosure() {
    this.settings.specialClosures.push({ closureDate: '', reason: '' });
    this.onFieldChange();
  }

  removeClosure(index: number) {
    this.settings.specialClosures.splice(index, 1);
    this.onFieldChange();
  }

  // Professional Management
  openProfessionalModal(p?: Professional) {
    this.editingProfessional = p ? { ...p, accessPassword: '' } : { fullName: '', specialty: '', active: true, accessPassword: '' };
    this.isProfessionalModalOpen = true;
  }

  closeProfessionalModal() {
    this.isProfessionalModalOpen = false;
  }

  saveProfessional() {
    if (!this.editingProfessional.fullName || !this.editingProfessional.specialty) {
      this.notification.warning('Nombre y especialidad son obligatorios');
      return;
    }

    if (!this.editingProfessional.id && !this.editingProfessional.accessPassword) {
      this.notification.warning('La clave de acceso es obligatoria para nuevos profesionales');
      return;
    }

    const obs = this.editingProfessional.id 
      ? this.professionalApi.updateProfessional(this.editingProfessional.id, this.editingProfessional as any)
      : this.professionalApi.createProfessional(this.editingProfessional as any);

    obs.subscribe({
      next: () => {
        this.loadAll();
        this.closeProfessionalModal();
      },
      error: (err) => {
        console.error('Error saving professional:', err);
        this.notification.error('Error al guardar el profesional. Compruebe los datos.');
      }
    });
  }

  deleteProfessional() {
    if (!this.editingProfessional?.id) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar este profesional? Esta acción no se puede deshacer.')) {
      this.professionalApi.deleteProfessional(this.editingProfessional.id).subscribe({
        next: () => {
          this.loadAll();
          this.closeProfessionalModal();
        },
        error: (err) => {
          console.error('Error deleting professional:', err);
          this.notification.error('Error al eliminar el profesional');
        }
      });
    }
  }

  toggleProfessionalStatus(p: Professional) {
    const updated = { ...p, active: !p.active };
    if (p.id) {
      this.professionalApi.updateProfessional(p.id, updated).subscribe(() => this.loadAll());
    }
  }

  // Interface Settings
  setTheme(mode: ThemeMode) {
    this.themeService.setTheme(mode);
  }

  setPrimaryColor(color: PrimaryColor) {
    this.themeService.setPrimaryColor(color);
  }

  cancelChanges() {
    this.router.navigate(['/']);
  }
}
