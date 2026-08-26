import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Appointment } from '../../core/models/appointment.model';

export function todayIsoDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createAppointmentForm(fb: NonNullableFormBuilder) {
  return fb.group({
    clientId: fb.control<number | null>(null),
    clientName: fb.control('', [Validators.required]),
    serviceId: fb.control<number | null>(null),
    serviceName: fb.control('', [Validators.required]),
    price: fb.control(0, [Validators.required, Validators.min(0)]),
    professionalName: fb.control(''),
    appointmentDate: fb.control(todayIsoDate(), [Validators.required]),
    appointmentTime: fb.control('09:30:00', [Validators.required]),
    status: fb.control<'PENDING' | 'CONFIRMED' | 'CANCELLED'>('PENDING', [Validators.required]),
    internalNotes: fb.control(''),
  });
}

export type AppointmentFormGroup = ReturnType<typeof createAppointmentForm>;

export function buildAppointmentPayload(value: ReturnType<AppointmentFormGroup['getRawValue']>): Partial<Appointment> {
  return {
    clientId: value.clientId ?? 0,
    clientName: value.clientName.trim(),
    serviceId: value.serviceId ?? 0,
    serviceName: value.serviceName.trim(),
    price: Number(value.price),
    professionalName: value.professionalName || undefined,
    appointmentDate: value.appointmentDate,
    appointmentTime: value.appointmentTime,
    status: value.status,
    internalNotes: value.internalNotes.trim() || undefined,
  };
}
