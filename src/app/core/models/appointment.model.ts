export interface Appointment {
  id?: number;
  clientId: number;
  clientName?: string; // response
  serviceId: number;
  serviceName?: string; // response
  price: number;
  professionalName?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm:ss
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  internalNotes?: string;
}

export interface AgendaDay {
  dateObj: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}
