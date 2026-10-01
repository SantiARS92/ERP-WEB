import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass, NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { Appointment, AgendaDay } from '../../core/models/appointment.model';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { FormsModule } from '@angular/forms';
import { Professional } from '../../core/models/professional.model';
import { formatTime24, toIsoDate } from '../../core/utils/date.util';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { SettingsStore } from '../../core/state/settings.store';
import { buildTimeOptions, DEFAULT_END_HOUR, DEFAULT_START_HOUR, getAgendaHourRange } from '../../core/utils/agenda-hours.util';
import { DayOfWeek } from '../../core/models/settings.model';

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const DAY_FORMATTER = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
// Índice = Date.getDay() (0 = domingo)
const WEEK_DAYS: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];


@Component({
  selector: 'app-agenda',
  imports: [NgClass, NgStyle, RouterLink, FormsModule],
  templateUrl: './agenda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Agenda implements OnInit {
  currentWeekStart!: Date;
  days: AgendaDay[] = [];
  startHour = DEFAULT_START_HOUR;
  endHour = DEFAULT_END_HOUR;
  hours: number[] = [];

  private readonly appointmentsSignal = signal<Appointment[]>([]);
  viewMode: 'day' | 'week' = 'week';
  selectedDate: Date = new Date();

  // Modal State
  private readonly isEditModalOpenSignal = signal(false);
  private readonly selectedAppointmentSignal = signal<Partial<Appointment>>({});
  private readonly isSubmittingSignal = signal(false);
  readonly canManageAppointments = computed(() => this.authService.currentUser()?.role !== UserRole.GUEST);

  // For the modal select/autocomplete
  private readonly allClientsSignal = signal<Client[]>([]);
  private readonly allServicesSignal = signal<Service[]>([]);
  private readonly allProfessionalsSignal = signal<Professional[]>([]);
  private readonly filteredClientsSignal = signal<Client[]>([]);
  timeOptions: string[] = [];


  // Real time indicator
  readonly formatTime = formatTime24;
  private readonly currentTimePositionSignal = signal(0);
  private readonly destroyRef = inject(DestroyRef);

  private appointmentApi = inject(AppointmentApiService);
  private professionalApi = inject(ProfessionalApiService);
  public authService = inject(AuthService);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);
  private settingsStore = inject(SettingsStore);


  get appointments() { return this.appointmentsSignal(); }
  set appointments(value: Appointment[]) { this.appointmentsSignal.set(value); }
  get isEditModalOpen() { return this.isEditModalOpenSignal(); }
  set isEditModalOpen(value: boolean) { this.isEditModalOpenSignal.set(value); }
  get selectedAppointment() { return this.selectedAppointmentSignal(); }
  set selectedAppointment(value: Partial<Appointment>) { this.selectedAppointmentSignal.set(value); }
  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }
  get allClients() { return this.allClientsSignal(); }
  set allClients(value: Client[]) { this.allClientsSignal.set(value); }
  get allServices() { return this.allServicesSignal(); }
  set allServices(value: Service[]) { this.allServicesSignal.set(value); }
  get allProfessionals() { return this.allProfessionalsSignal(); }
  set allProfessionals(value: Professional[]) { this.allProfessionalsSignal.set(value); }
  get filteredClients() { return this.filteredClientsSignal(); }
  set filteredClients(value: Client[]) { this.filteredClientsSignal.set(value); }
  get currentTimePosition() { return this.currentTimePositionSignal(); }
  set currentTimePosition(value: number) { this.currentTimePositionSignal.set(value); }

  ngOnInit() {
    this.selectedDate = new Date();
    this.updateHourRange();
    // Los ajustes se cargan al arrancar la app, antes del login; si no llegaron, se piden ahora
    if (!this.settingsStore.settings()) {
      this.settingsStore.load().then(() => this.calculateAllStyles());
    }

    this.initCurrentWeek();
    this.calculateCurrentTimePosition();
    this.loadAllData();

    // Update red line every minute
    interval(60000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.calculateCurrentTimePosition();
      });
  }

  private readonly appointmentStylesSignal = signal<Record<number, Record<string, string | number>>>({});
  get appointmentStyles() { return this.appointmentStylesSignal(); }
  set appointmentStyles(value: Record<number, Record<string, string | number>>) { this.appointmentStylesSignal.set(value); }

  initCurrentWeek() {
    const today = this.selectedDate;
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    this.currentWeekStart = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    this.generateDays();
    this.loadAppointments();
  }

  loadAllData() {
    this.clientsStore.ensureLoaded().subscribe((clients) => this.allClients = clients);
    this.servicesStore.ensureLoaded().subscribe((services) => {
      this.allServices = services.filter((service) => service.active);
      this.calculateAllStyles();
    });
    this.professionalApi.getProfessionals(true).subscribe(res => this.allProfessionals = res);
  }

  generateDays() {
    this.days = [];
    const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    if (this.viewMode === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(this.currentWeekStart);
        d.setDate(this.currentWeekStart.getDate() + i);

        this.days.push({
          dateObj: d,
          dateStr: this.formatDate(d),
          dayName: dayNames[(d.getDay() + 6) % 7], // Correct mapping for Monday start
          dayNumber: d.getDate(),
          isToday: this.isToday(d)
        });
      }
    } else {
      // Day mode
      const d = new Date(this.selectedDate);
      this.days.push({
        dateObj: d,
        dateStr: this.formatDate(d),
        dayName: dayNames[(d.getDay() + 6) % 7],
        dayNumber: d.getDate(),
        isToday: this.isToday(d)
      });
    }
  }

  loadAppointments() {
    const startStr = this.days[0].dateStr;
    const endStr = this.days[this.days.length - 1].dateStr;

    this.appointmentApi.getAppointments(startStr, endStr).subscribe((data: Appointment[]) => {
      this.appointments = data;
      this.calculateAllStyles();
    });
  }

  // --- Helpers ---

  formatDate(date: Date): string {
    return toIsoDate(date);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  getWeekDateRange(): string {
    if (!this.days.length) return '';
    const start = this.days[0].dateObj;
    const end = this.days[this.days.length - 1].dateObj;
    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();

    const startLabel = sameMonth
      ? `${start.getDate()}`
      : `${start.getDate()} ${MONTH_FORMATTER.format(start)}${sameYear ? '' : ' ' + start.getFullYear()}`;
    return `${startLabel} – ${end.getDate()} ${MONTH_FORMATTER.format(end)} ${end.getFullYear()}`;
  }

  getDayLabel(): string {
    return this.days.length ? DAY_FORMATTER.format(this.days[0].dateObj) : '';
  }

  goToday() {
    this.selectedDate = new Date();
    this.initCurrentWeek();
  }


  toggleViewMode(mode: 'day' | 'week') {
    this.viewMode = mode;
    this.generateDays();
    this.loadAppointments();
  }

  // Navigation
  prev() {
    if (this.viewMode === 'week') {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
      this.selectedDate.setDate(this.selectedDate.getDate() - 7);
    } else {
      this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    }
    this.initCurrentWeek();
  }

  next() {
    if (this.viewMode === 'week') {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
      this.selectedDate.setDate(this.selectedDate.getDate() + 7);
    } else {
      this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    }
    this.initCurrentWeek();
  }

  // Etiqueta de la hora en 24 h (ej. 08:00, 17:00)
  formatHourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }


  // --- Grid Positioning Logic ---

  getAppointmentsForDay(dateStr: string): Appointment[] {
    return this.appointments.filter(a => a.appointmentDate === dateStr);
  }

  getAppointmentDuration(app: Appointment): number {
    const srv = this.allServices.find(s => s.name === app.serviceName || s.id === app.serviceId);
    return srv ? srv.durationMinutes : 60; // Default to 60 if not found
  }

  updateHourRange() {
    const range = getAgendaHourRange(this.settingsStore.settings()?.openingHours);

    // Ampliar el rango para que ninguna cita quede fuera de la cuadrícula
    for (const app of this.appointments) {
      const [h, m] = app.appointmentTime.split(':').map(Number);
      const endMin = h * 60 + m + this.getAppointmentDuration(app);
      range.start = Math.min(range.start, h);
      range.end = Math.max(range.end, Math.ceil(endMin / 60));
    }

    this.startHour = range.start;
    this.endHour = Math.min(range.end, 24);
    this.hours = Array.from({ length: this.endHour - this.startHour }, (_, i) => this.startHour + i);
    this.timeOptions = buildTimeOptions(this.startHour, this.endHour);
    this.calculateCurrentTimePosition();
  }


  calculateAllStyles() {
    this.updateHourRange();
    this.appointmentStyles = {};
    for (const day of this.days) {
      const dayApps = this.getAppointmentsForDay(day.dateStr);
      if (!dayApps.length) continue;

      const appsWithTime = dayApps.map(app => {
        const [h, m] = app.appointmentTime.split(':').map(Number);
        const actualDuration = this.getAppointmentDuration(app);
        const duration = Math.max(actualDuration, 45); // Enforce min height to prevent text squishing
        const startMin = h * 60 + m;
        const endMin = startMin + duration;
        return { app, startH: h, startM: m, duration, startMin, endMin, colIdx: 0, actualDuration };
      });

      appsWithTime.sort((a, b) => {
        if (a.startMin !== b.startMin) return a.startMin - b.startMin;
        return b.duration - a.duration;
      });

      const clusters: (typeof appsWithTime)[] = [];
      let currentCluster: typeof appsWithTime = [];
      let clusterEnd = -1;

      for (const item of appsWithTime) {
        if (item.startMin >= clusterEnd) {
          if (currentCluster.length > 0) clusters.push(currentCluster);
          currentCluster = [item];
          clusterEnd = item.endMin;
        } else {
          currentCluster.push(item);
          clusterEnd = Math.max(clusterEnd, item.endMin);
        }
      }
      if (currentCluster.length > 0) clusters.push(currentCluster);

      for (const cluster of clusters) {
        const columns: number[] = [];

        for (const item of cluster) {
          let colIdx = columns.findIndex(endTime => endTime <= item.startMin);
          if (colIdx === -1) {
            colIdx = columns.length;
            columns.push(item.endMin);
          } else {
            columns[colIdx] = item.endMin;
          }
          item.colIdx = colIdx;
        }

        const numCols = columns.length;
        const widthPercent = 90 / numCols;

        for (const item of cluster) {
          if (item.app.id !== undefined) {
            this.appointmentStyles = {
              ...this.appointmentStyles,
              [item.app.id]: {
                'top.px': this.timeToPixels(item.startH, item.startM),
                'height.px': (item.duration / 60) * 100 - 2,
                'width.%': widthPercent,
                'left.%': 5 + (item.colIdx * widthPercent)
              },
            };
          }
        }
      }
    }
  }

  getAppointmentStyle(app: Appointment): Record<string, string | number> {
    if (app.id && this.appointmentStyles[app.id]) {
      return this.appointmentStyles[app.id];
    }
    const [startH, startM] = app.appointmentTime.split(':').map(Number);
    const duration = Math.max(this.getAppointmentDuration(app), 45);
    return {
      'top.px': this.timeToPixels(startH, startM),
      'height.px': (duration / 60) * 100 - 2,
      'width.%': 90,
      'left.%': 5
    };
  }

  getAppointmentWidth(app: Appointment): number {
    return Number(this.getAppointmentStyle(app)['width.%'] ?? 90);
  }

  getAppointmentClass(app: Appointment): string {
    switch (app.status) {
      case 'CANCELLED': return 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100';
      case 'PENDING': return 'bg-amber-50 border border-amber-200 border-l-[3px] border-l-amber-400 text-amber-900 hover:bg-amber-100';
      case 'CONFIRMED': return 'bg-blue-50 border border-blue-200 border-l-[3px] border-l-blue-500 text-blue-900 hover:bg-blue-100';
      default: return 'bg-indigo-50 border border-indigo-200 border-l-[3px] border-l-indigo-500 text-indigo-900 hover:bg-indigo-100';
    }
  }

  getStatusDotClass(app: Appointment): string {
    switch (app.status) {
      case 'CANCELLED': return 'bg-slate-300';
      case 'PENDING': return 'bg-amber-400';
      case 'CONFIRMED': return 'bg-blue-500';
      default: return 'bg-indigo-500';
    }
  }

  getAppointmentEndTime(app: Appointment): string {
    const [h, m] = app.appointmentTime.split(':').map(Number);
    const end = h * 60 + m + this.getAppointmentDuration(app);
    return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  }

  /** Tramos del día fuera del horario de apertura (en px). Sin horario configurado no se sombrea nada */
  getClosedBlocks(day: AgendaDay): { top: number; height: number }[] {
    const openingHours = this.settingsStore.settings()?.openingHours ?? [];
    if (!openingHours.some((h) => h.enabled)) return [];

    const total = this.hours.length * 100;
    const oh = openingHours.find((h) => h.dayOfWeek === WEEK_DAYS[day.dateObj.getDay()]);
    if (!oh?.enabled || !oh.openingTime || !oh.closingTime) {
      return [{ top: 0, height: total }]; // día cerrado
    }

    const [oH, oM] = oh.openingTime.split(':').map(Number);
    const [cH, cM] = oh.closingTime.split(':').map(Number);
    const openPx = this.timeToPixels(oH, oM);
    const closePx = this.timeToPixels(cH, cM);
    return [
      { top: 0, height: openPx },
      { top: closePx, height: total - closePx },
    ].filter((block) => block.height > 0);
  }


  // Píxeles desde la primera hora visible (cada hora = 100px). Ej: con inicio 08:00, 09:30 = 150px
  timeToPixels(hour: number, minute: number): number {
    const hourPx = 100;
    return ((hour - this.startHour) * hourPx) + ((minute / 60) * hourPx);
  }


  calculateCurrentTimePosition() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    if (h >= this.startHour && h < this.endHour) {
      this.currentTimePosition = this.timeToPixels(h, m);
    } else {
      this.currentTimePosition = -1; // hide if out of bounds
    }
  }

  get currentTimeLabel(): string {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // --- Modal Logic ---

  openEditModal(app: Appointment) {
    this.selectedAppointment = { ...app };
    this.isEditModalOpen = true;
    this.closeAllDropdowns();
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedAppointment = {};
  }

  onClientSearch() {
    const query = (this.selectedAppointment.clientName || '').toLowerCase();
    if (!query) {
      this.filteredClients = [];
      return;
    }
    this.filteredClients = this.allClients.filter(c => c.fullName.toLowerCase().includes(query));
  }

  selectClient(client: Client) {
    this.selectedAppointment.clientId = client.id;
    this.selectedAppointment.clientName = client.fullName;
    this.filteredClients = [];
  }

  onServiceChange() {
    const srv = this.allServices.find(s => s.name === this.selectedAppointment.serviceName);
    if (srv) {
      this.selectedAppointment.serviceId = srv.id;
      this.selectedAppointment.price = srv.price;
    }
  }

  selectTime(time: string) {
    this.selectedAppointment.appointmentTime = time + ':00';
    this.isTimeDropdownOpen = false;
  }

  selectStatus(status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') {
    this.selectedAppointment.status = status;
    this.isStatusDropdownOpen = false;
  }

  // Dropdown toggles (reusing types from create-appointment)
  isTimeDropdownOpen = false;
  isStatusDropdownOpen = false;
  isClientDropdownOpen = false;

  toggleTimeDropdown(event: Event) {
    event.stopPropagation();
    this.closeAllDropdowns();
    this.isTimeDropdownOpen = true;
  }

  toggleStatusDropdown(event: Event) {
    event.stopPropagation();
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  closeAllDropdowns() {
    this.isTimeDropdownOpen = false;
    this.isStatusDropdownOpen = false;
    this.isClientDropdownOpen = false;
    this.filteredClients = [];
  }

  updateAppointment() {
    if (!this.selectedAppointment.id) return;
    this.isSubmitting = true;
    this.appointmentApi.updateAppointment(this.selectedAppointment.id, this.selectedAppointment)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: () => {
          this.loadAppointments();
          this.closeEditModal();
        },
        error: () => {
          this.notification.error('Error al actualizar la cita.');
        }
      });
  }

  async deleteAppointment() {
    if (!this.selectedAppointment.id) return;

    const confirmed = await this.confirm.ask('¿Estás seguro de que deseas eliminar esta cita?', {
      title: 'Eliminar cita',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    this.isSubmitting = true;
    this.appointmentApi.deleteAppointment(this.selectedAppointment.id)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: () => {
          this.loadAppointments();
          this.closeEditModal();
        },
        error: () => {
          this.notification.error('Error al eliminar la cita.');
        }
      });
  }
}
