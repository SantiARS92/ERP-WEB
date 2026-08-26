import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ThemeService, PrimaryColor, ThemeMode } from '../../core/services/theme.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { BusinessSettings, DayOfWeek, OpeningHour } from '../../core/models/settings.model';
import { Professional } from '../../core/models/professional.model';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsStore } from '../../core/state/settings.store';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-configuracion',
  imports: [NgClass, FormsModule, RouterLink],
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuracion implements OnInit, OnDestroy {
  // Accordion state
  private readonly expandedSectionSignal = signal<string | null>('perfil');
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();
  private router = inject(Router);
  themeService = inject(ThemeService);
  private settingsStore = inject(SettingsStore);
  private professionalApi = inject(ProfessionalApiService);
  authService = inject(AuthService);
  readonly isAdmin = computed(() => this.authService.hasRole([UserRole.ADMIN]));
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);

  availableColors: { name: PrimaryColor, label: string, hex: string }[] = [
    { name: 'blue', label: 'Azul', hex: '#3b82f6' },
    { name: 'indigo', label: 'Índigo', hex: '#6366f1' },
    { name: 'purple', label: 'Púrpura', hex: '#a855f7' },
    { name: 'rose', label: 'Rosa', hex: '#f43f5e' },
    { name: 'emerald', label: 'Esmeralda', hex: '#10b981' },
    { name: 'amber', label: 'Ámbar', hex: '#f59e0b' }
  ];

  // --- Real State ---
  private readonly settingsSignal = signal<BusinessSettings>({
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
  });

  private readonly professionalsSignal = signal<Professional[]>([]);
  private readonly isSubmittingSignal = signal(false);
  private readonly saveStatusSignal = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  private saveResetTimer: any = null;

  // For adding/editing professional (Modal mini-state)
  private readonly isProfessionalModalOpenSignal = signal(false);
  private readonly editingProfessionalSignal = signal<Professional & { accessPassword?: string }>({ fullName: '', specialty: '', active: true, accessPassword: '' });

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

  get expandedSection() { return this.expandedSectionSignal(); }
  set expandedSection(value: string | null) { this.expandedSectionSignal.set(value); }
  get settings() { return this.settingsSignal(); }
  set settings(value: BusinessSettings) { this.settingsSignal.set(value); }
  get professionals() { return this.professionalsSignal(); }
  set professionals(value: Professional[]) { this.professionalsSignal.set(value); }
  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }
  get saveStatus() { return this.saveStatusSignal(); }
  set saveStatus(value: 'idle' | 'saving' | 'saved' | 'error') { this.saveStatusSignal.set(value); }
  get isProfessionalModalOpen() { return this.isProfessionalModalOpenSignal(); }
  set isProfessionalModalOpen(value: boolean) { this.isProfessionalModalOpenSignal.set(value); }
  get editingProfessional() { return this.editingProfessionalSignal(); }
  set editingProfessional(value: Professional & { accessPassword?: string }) { this.editingProfessionalSignal.set(value); }

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

  private ensureOpeningHours() {
    const current = this.settings;
    const openingHours = this.orderedDays.map((day) => current.openingHours.find((hour) => hour.dayOfWeek === day)
      ?? { dayOfWeek: day, enabled: false, openingTime: null, closingTime: null });
    this.settings = { ...current, openingHours };
  }

  loadAll() {
    const cachedSettings = this.settingsStore.settings();
    if (cachedSettings) {
      this.settings = this.buildPersistedSettings(cachedSettings);
      this.ensureOpeningHours();
    }

    this.settingsStore.load().then(() => {
      const loadedSettings = this.settingsStore.settings();
      if (loadedSettings) {
        this.settings = this.buildPersistedSettings(loadedSettings);
      }
      this.ensureOpeningHours();
    });

    this.professionalApi.getProfessionals().subscribe({
      next: (data) => { this.professionals = data; },
      error: () => this.notification.error('Error al cargar los profesionales.')
    });
  }

  private buildPersistedSettings(data: BusinessSettings): BusinessSettings {
    return {
      ...this.settings,
      ...data,
      openingHours: data.openingHours?.length ? data.openingHours : this.settings.openingHours,
      specialClosures: data.specialClosures ?? [],
    };
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
    this.settingsStore.updateSettings(this.settings).subscribe({
      next: (data) => {
        this.settings = this.buildPersistedSettings(data);
        this.isSubmitting = false;
        this.saveStatus = 'saved';
        this.saveResetTimer = setTimeout(() => { this.saveStatus = 'idle'; }, 3000);
      },
      error: () => {
        this.isSubmitting = false;
        this.saveStatus = 'error';
        this.saveResetTimer = setTimeout(() => { this.saveStatus = 'idle'; }, 5000);
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
      const businessLogo = e.target?.result as string;
      this.settings = { ...this.settings, businessLogo };
      this.settingsStore.updateLocalLogo(businessLogo);
      this.onFieldChange(); // triggers auto-save
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.settings = { ...this.settings, businessLogo: '' };
    this.settingsStore.updateLocalLogo('');
    this.onFieldChange();
  }

  // Management for Opening Hours
  getOpeningHourForDay(day: DayOfWeek): OpeningHour {
    return this.settings.openingHours.find(h => h.dayOfWeek === day)
      ?? { dayOfWeek: day, enabled: false, openingTime: null, closingTime: null };
  }

  toggleDay(oh: OpeningHour) {
    this.settings = {
      ...this.settings,
      openingHours: this.settings.openingHours.map((item) => item.dayOfWeek !== oh.dayOfWeek ? item : {
        ...item,
        enabled: !item.enabled,
        openingTime: !item.enabled ? '09:00' : null,
        closingTime: !item.enabled ? '18:00' : null,
      }),
    };
    this.onFieldChange();
  }

  updateOpeningHour(day: DayOfWeek, patch: Partial<OpeningHour>) {
    this.settings = {
      ...this.settings,
      openingHours: this.settings.openingHours.map((item) => item.dayOfWeek !== day ? item : { ...item, ...patch }),
    };
    this.onFieldChange();
  }

  // Management for Special Closures
  addClosure() {
    this.settings = {
      ...this.settings,
      specialClosures: [...this.settings.specialClosures, { closureDate: '', reason: '' }],
    };
    this.onFieldChange();
  }

  removeClosure(index: number) {
    this.settings = {
      ...this.settings,
      specialClosures: this.settings.specialClosures.filter((_, currentIndex) => currentIndex !== index),
    };
    this.onFieldChange();
  }

  updateClosure(index: number, patch: { closureDate?: string; reason?: string }) {
    this.settings = {
      ...this.settings,
      specialClosures: this.settings.specialClosures.map((closure, currentIndex) => currentIndex !== index ? closure : { ...closure, ...patch }),
    };
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
      error: () => {
        this.notification.error('Error al guardar el profesional. Compruebe los datos.');
      }
    });
  }

  async deleteProfessional() {
    if (!this.editingProfessional?.id) return;

    const confirmed = await this.confirm.ask('¿Estás seguro de que deseas eliminar este profesional? Esta acción no se puede deshacer.', {
      title: 'Eliminar profesional',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.professionalApi.deleteProfessional(this.editingProfessional.id).subscribe({
      next: () => {
        this.loadAll();
        this.closeProfessionalModal();
      },
      error: () => {
        this.notification.error('Error al eliminar el profesional');
      }
    });
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
