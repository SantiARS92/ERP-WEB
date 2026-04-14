import { Component, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { ProfessionalApiService } from '../../core/services/professional-api.service';
import { Appointment } from '../../core/models/appointment.model';
import { Client } from '../../core/models/client.model';
import { Service, ServicePage } from '../../core/models/service.model';
import { Professional } from '../../core/models/professional.model';

@Component({
  selector: 'app-create-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-appointment.html',
})
export class CreateAppointment {
  
  appointment: Partial<Appointment> = {
    clientName: '',
    serviceName: '',
    professionalName: '',
    appointmentDate: this.getTodayDateString(),
    appointmentTime: '09:30:00', // Default format HH:mm:ss
    status: 'PENDING',
    price: 0,
    internalNotes: ''
  };

  isSubmitting = false;
  isTimeDropdownOpen = false;
  isStatusDropdownOpen = false;
  isClientDropdownOpen = false;
  
  clients: Client[] = [];
  filteredClients: Client[] = [];
  services: Service[] = [];
  professionals: Professional[] = [];
  timeOptions = [
    '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  private appointmentApi = inject(AppointmentApiService);
  private clientApi = inject(ClientApiService);
  private serviceApi = inject(ServiceApiService);
  private professionalApi = inject(ProfessionalApiService);
  private router = inject(Router);
  private eRef = inject(ElementRef);

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
    this.serviceApi.getServices({ size: 100, active: true }).subscribe((res: ServicePage) => {
      this.services = res.content;
    });
  }

  loadClients() {
    this.clientApi.getClients({ size: 100 }).subscribe(res => {
      this.clients = res.content;
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

  getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onServiceChange() {
    const srv = this.services.find(s => s.name === this.appointment.serviceName);
    if (srv) {
      this.appointment.serviceId = srv.id;
      this.appointment.price = srv.price;
    }
  }

  // --- Client Search Autocomplete ---
  onClientSearch() {
    if (!this.appointment.clientName) {
      this.filteredClients = [];
      this.isClientDropdownOpen = false;
      return;
    }
    const query = this.appointment.clientName.toLowerCase();
    this.filteredClients = this.clients.filter(c => c.fullName.toLowerCase().includes(query));
    this.isClientDropdownOpen = this.filteredClients.length > 0;
  }

  selectClient(client: Client) {
    this.appointment.clientName = client.fullName;
    this.appointment.clientId = client.id;
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
    this.appointment.appointmentTime = time + ':00'; // Add seconds for the contract
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
    this.appointment.status = status;
    this.isStatusDropdownOpen = false;
  }

  onSubmit() {
    if (!this.appointment.clientName || !this.appointment.serviceName) return;

    this.isSubmitting = true;

    // Send the appointment object to the API
    this.appointmentApi.createAppointment(this.appointment)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: () => {
          this.router.navigate(['/agenda']);
        },
        error: (err) => {
          console.error('Error creating appt', err);
          alert('Error al guardar cita. Verifique la consola o el backend.');
        }
      });
  }

  cancel() {
    this.router.navigate(['/agenda']);
  }
}
