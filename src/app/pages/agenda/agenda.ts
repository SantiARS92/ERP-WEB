import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, NgClass, NgStyle, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { Appointment, AgendaDay } from '../../core/models/appointment.model';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { FormsModule } from '@angular/forms';
import { Professional } from '../../core/models/professional.model';
import { toIsoDate } from '../../core/utils/date.util';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', { month: 'short' });

@Component({
  selector: 'app-agenda',
  imports: [DatePipe, SlicePipe, NgClass, NgStyle, RouterLink, FormsModule],
  templateUrl: './agenda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Agenda implements OnInit {
  currentWeekStart!: Date;
  days: AgendaDay[] = [];
  hours: number[] = [8, 9, 10, 11, 12, 13, 14, 15, 16]; // 08 AM to 04 PM
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
  timeOptions = [
    '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];
  
  // Real time indicator
  private readonly currentTimePositionSignal = signal(0);
  private readonly destroyRef = inject(DestroyRef);
  
  private appointmentApi = inject(AppointmentApiService);
  private professionalApi = inject(ProfessionalApiService);
  public authService = inject(AuthService);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);

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
    const endStr = this.days[6].dateStr;
    
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
    const end = this.days[6].dateObj;
    
    const startNum = start.getDate();
    const endNum = end.getDate();
    // Assuming same month/year for simple UI formatting as in the picture
    const month = MONTH_FORMATTER.format(start);
    const year = start.getFullYear();
    
    return `${startNum} - ${endNum} ${month}, ${year}`;
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

  // Format hour label (e.g. 08 AM)
  formatHourLabel(hour: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    let h = hour % 12;
    if (h === 0) h = 12; // 12 PM/AM
    return `${String(h).padStart(2, '0')} ${ampm}`;
  }

  // --- Grid Positioning Logic ---
  
  getAppointmentsForDay(dateStr: string): Appointment[] {
    return this.appointments.filter(a => a.appointmentDate === dateStr);
  }

  getAppointmentDuration(app: Appointment): number {
    const srv = this.allServices.find(s => s.name === app.serviceName || s.id === app.serviceId);
    return srv ? srv.durationMinutes : 60; // Default to 60 if not found
  }

  calculateAllStyles() {
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
              'height.px': (item.duration / 60) * 100,
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
      'height.px': (duration / 60) * 100,
      'width.%': 90,
      'left.%': 5
    };
  }

  getAppointmentWidth(app: Appointment): number {
    return Number(this.getAppointmentStyle(app)['width.%'] ?? 90);
  }

  getAppointmentClass(app: Appointment): string {
    if (app.status === 'CANCELLED') {
      return 'bg-slate-100 border-l-4 border-slate-300 text-slate-500';
    } else if (app.status === 'CONFIRMED') {
      return 'bg-blue-100 border-l-4 border-blue-500 text-blue-900';
    } else if (app.status === 'PENDING') {
      return 'bg-orange-100 border-l-4 border-orange-500 text-orange-900';
    }
    return 'bg-indigo-100 border-l-4 border-indigo-500 text-indigo-900';
  }

  // Calculates pixels from 08:00 AM. 
  // Base constants: each hour = row height of 100px.
  // Example: 08:00 = 0px, 09:30 = 150px
  timeToPixels(hour: number, minute: number): number {
    const baseHour = 8;
    const hourPx = 100;
    
    // clamp bounds slightly if appointment overlaps outside
    const safeHour = Math.max(8, Math.min(hour, 17)); 
    const diffHours = safeHour - baseHour;
    
    return (diffHours * hourPx) + ((minute / 60) * hourPx);
  }

  calculateCurrentTimePosition() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    
    if (h >= 8 && h < 17) {
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

  formatTimeAMPM(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
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
