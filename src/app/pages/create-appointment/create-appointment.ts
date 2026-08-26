import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { Appointment } from '../../core/models/appointment.model';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';
import { Professional } from '../../core/models/professional.model';
import { NotificationService } from '../../core/services/notification.service';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { buildAppointmentPayload, createAppointmentForm, todayIsoDate } from '../../shared/forms/appointment-form';

@Component({
  selector: 'app-create-appointment',
  imports: [NgClass, ReactiveFormsModule, RouterLink],
  templateUrl: './create-appointment.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAppointment implements OnInit {
  private readonly isSubmittingSignal = signal(false);
  readonly form = createAppointmentForm(inject(NonNullableFormBuilder));
  isTimeDropdownOpen = false;
  isStatusDropdownOpen = false;
  isClientDropdownOpen = false;
  
  private readonly clientsSignal = signal<Client[]>([]);
  private readonly filteredClientsSignal = signal<Client[]>([]);
  private readonly servicesSignal = signal<Service[]>([]);
  private readonly professionalsSignal = signal<Professional[]>([]);
  timeOptions = [
    '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  private appointmentApi = inject(AppointmentApiService);
  private professionalApi = inject(ProfessionalApiService);
  private router = inject(Router);
  private eRef = inject(ElementRef);
  private notification = inject(NotificationService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);

  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }
  get clients() { return this.clientsSignal(); }
  set clients(value: Client[]) { this.clientsSignal.set(value); }
  get filteredClients() { return this.filteredClientsSignal(); }
  set filteredClients(value: Client[]) { this.filteredClientsSignal.set(value); }
  get services() { return this.servicesSignal(); }
  set services(value: Service[]) { this.servicesSignal.set(value); }
  get professionals() { return this.professionalsSignal(); }
  set professionals(value: Professional[]) { this.professionalsSignal.set(value); }

  ngOnInit() {
    this.loadClients();
    this.loadServices();
    this.loadProfessionals();
  }

  loadProfessionals() {
    this.professionalApi.getProfessionals(true).subscribe(res => {
      this.professionals = res;
    });
  }

  loadServices() {
    this.servicesStore.ensureLoaded().subscribe((services) => {
      this.services = services.filter((service) => service.active);
    });
  }

  loadClients() {
    this.clientsStore.ensureLoaded().subscribe((clients) => {
      this.clients = clients;
    });
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if(!this.eRef.nativeElement.contains(event.target)) {
      this.closeAllDropdowns();
    }
  }

  closeAllDropdowns() {
    this.isTimeDropdownOpen = false;
    this.isStatusDropdownOpen = false;
    this.isClientDropdownOpen = false;
  }

  onServiceChange() {
    const serviceName = this.form.controls.serviceName.value;
    const srv = this.services.find(s => s.name === serviceName);
    if (srv) {
      this.form.patchValue({ serviceId: srv.id ?? null, price: srv.price });
    }
  }

  // --- Client Search Autocomplete ---
  onClientSearch() {
    const clientName = this.form.controls.clientName.value;
    if (!clientName) {
      this.filteredClients = [];
      this.isClientDropdownOpen = false;
      return;
    }
    const query = clientName.toLowerCase();
    this.filteredClients = this.clients.filter(c => c.fullName.toLowerCase().includes(query));
    this.isClientDropdownOpen = this.filteredClients.length > 0;
  }

  selectClient(client: Client) {
    this.form.patchValue({ clientName: client.fullName, clientId: client.id ?? null });
    this.isClientDropdownOpen = false;
  }

  // Formatting helper for time dropdown display
  formatTimeAMPM(time24: string): string {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
  }

  selectTime(time: string, event: Event) {
    event.stopPropagation();
    this.form.controls.appointmentTime.setValue(`${time}:00`);
    this.isTimeDropdownOpen = false;
  }

  toggleTimeDropdown(event: Event) {
    event.stopPropagation();
    this.closeAllDropdowns();
    this.isTimeDropdownOpen = true; // explicitly toggle open
  }

  // --- Status Dropdown ---
  toggleStatusDropdown(event: Event) {
    event.stopPropagation();
    const currentState = this.isStatusDropdownOpen;
    this.closeAllDropdowns();
    this.isStatusDropdownOpen = !currentState;
  }

  selectStatus(status: 'PENDING' | 'CONFIRMED' | 'CANCELLED', event: Event) {
    event.stopPropagation();
    this.form.controls.status.setValue(status);
    this.isStatusDropdownOpen = false;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.appointmentApi.createAppointment(buildAppointmentPayload(this.form.getRawValue()))
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: () => {
          this.router.navigate(['/agenda']);
        },
        error: () => {
          this.notification.error('Error al guardar la cita.');
        }
      });
  }

  protected readonly todayIsoDate = todayIsoDate;

  cancel() {
    this.router.navigate(['/agenda']);
  }
}
