import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { Appointment, AgendaDay } from '../../core/models/appointment.model';
import { ClientApiService } from '../../core/services/client-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { FormsModule } from '@angular/forms';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './agenda.html',
})
export class Agenda implements OnInit {
  currentWeekStart!: Date;
  days: AgendaDay[] = [];
  hours: number[] = [8, 9, 10, 11, 12, 13, 14, 15, 16]; // 08 AM to 04 PM
  appointments: Appointment[] = [];
  viewMode: 'day' | 'week' = 'week';
  selectedDate: Date = new Date();
  
  // Modal State
  isEditModalOpen = false;
  selectedAppointment: Partial<Appointment> = {};
  isSubmitting = false;
  
  // For the modal select/autocomplete
  allClients: any[] = [];
  allServices: any[] = [];
  filteredClients: any[] = [];
  timeOptions = [
    '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];
  
  // Real time indicator
  currentTimePosition = 0;
  
  private appointmentApi = inject(AppointmentApiService);
  private clientApi = inject(ClientApiService);
  private serviceApi = inject(ServiceApiService);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);

  ngOnInit() {
    this.selectedDate = new Date();
    this.initCurrentWeek();
    this.calculateCurrentTimePosition();
    this.loadAllData();
    
    // Update red line every minute
    setInterval(() => {
      this.calculateCurrentTimePosition();
      this.cdr.detectChanges();
    }, 60000);
  }

  initCurrentWeek() {
    const today = this.selectedDate;
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    
    this.currentWeekStart = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    this.generateDays();
    this.loadAppointments();
  }

  loadAllData() {
    this.clientApi.getClients({ size: 100 }).subscribe((res: any) => this.allClients = res.content);
    this.serviceApi.getServices({ size: 100, active: true }).subscribe((res: any) => this.allServices = res.content);
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
      this.cdr.detectChanges();
    });
  }

  // --- Helpers ---
  
  formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
    const month = this.datePipe.transform(start, 'MMM');
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

  getAppointmentStyle(app: Appointment): any {
    // Determine top offset
    const [startH, startM] = app.appointmentTime.split(':').map(Number);
    const topPx = this.timeToPixels(startH, startM);
    
    // Determine height - default to 60 mins since endTime is removed
    const heightPx = 100; // 100px = 1 hour in this grid
    
    // OVERLAP LOGIC: Calculate width and left based on concurrent apps
    const dayApps = this.getAppointmentsForDay(app.appointmentDate)
                    .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    
    // Find clusters of overlapping appointments
    // Simplified algorithm for "split space"
    const concurrent = dayApps.filter(other => {
      if (other.id === app.id) return false;
      const [h1, m1] = app.appointmentTime.split(':').map(Number);
      const [h2, m2] = other.appointmentTime.split(':').map(Number);
      const t1 = h1 * 60 + m1;
      const t2 = h2 * 60 + m2;
      // Overlap if start times are within 59 mins (assuming 60 min duration)
      return Math.abs(t1 - t2) < 60;
    });

    const totalInSlot = concurrent.length + 1;
    const positionInSlot = concurrent.filter(other => 
      other.appointmentTime < app.appointmentTime || 
      (other.appointmentTime === app.appointmentTime && (other.id || 0) < (app.id || 0))
    ).length;

    const width = (90 / totalInSlot);
    const left = 5 + (positionInSlot * (90 / totalInSlot));

    return {
      'top.px': topPx,
      'height.px': heightPx,
      'width.%': width,
      'left.%': left
    };
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

  selectClient(client: any) {
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
    let hour = h % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  updateAppointment() {
    if (!this.selectedAppointment.id) return;
    console.log('Actualizando cita:', this.selectedAppointment.id);
    this.isSubmitting = true;
    this.appointmentApi.updateAppointment(this.selectedAppointment.id, this.selectedAppointment)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          console.log('Cita actualizada con éxito');
          this.loadAppointments();
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Error al actualizar:', err);
          alert('Error al actualizar la cita. Verifique la consola o el backend.');
        }
      });
  }

  deleteAppointment() {
    if (!this.selectedAppointment.id || !confirm('¿Estás seguro de que deseas eliminar esta cita?')) return;
    console.log('Eliminando cita:', this.selectedAppointment.id);
    this.isSubmitting = true;
    this.appointmentApi.deleteAppointment(this.selectedAppointment.id)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          console.log('Cita eliminada con éxito');
          this.loadAppointments();
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('Error al eliminar la cita. Verifique la consola o el backend.');
        }
      });
  }
}
