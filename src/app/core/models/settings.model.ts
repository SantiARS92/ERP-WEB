export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface OpeningHour {
  dayOfWeek: DayOfWeek;
  enabled: boolean;
  openingTime: string | null; // HH:mm
  closingTime: string | null; // HH:mm
}

export interface SpecialClosure {
  closureDate: string; // yyyy-MM-dd
  reason?: string;
}

export interface BusinessSettings {
  businessName: string;
  phone: string;
  address: string;
  contactEmail: string;
  onlineBookingEnabled: boolean;
  defaultAppointmentDurationMinutes: number;
  minimumAdvanceMinutes: number;
  maximumAdvanceDays: number;
  freeCancellationHours: number;
  cancellationPolicy: string;
  openingHours: OpeningHour[];
  specialClosures: SpecialClosure[];
  businessLogo?: string; // Optional for now, as it's not in the main contract but requested by user
  cip?: string;
}
