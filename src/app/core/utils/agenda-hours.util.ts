import { OpeningHour } from '../models/settings.model';

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 21;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Rango de horas [start, end) a partir del horario de apertura; 08-21 si no hay ninguno configurado */
export function getAgendaHourRange(openingHours: OpeningHour[] | undefined): { start: number; end: number } {
  const enabled = (openingHours ?? []).filter((h) => h.enabled && h.openingTime && h.closingTime);
  if (!enabled.length) {
    return { start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR };
  }
  const start = Math.min(...enabled.map((h) => Math.floor(toMinutes(h.openingTime!) / 60)));
  const end = Math.max(...enabled.map((h) => Math.ceil(toMinutes(h.closingTime!) / 60)));
  return { start, end };
}

/** Horas seleccionables cada `stepMinutes` entre start y end (ej. '09:00', '09:30'...) */
export function buildTimeOptions(start: number, end: number, stepMinutes = 30): string[] {
  const options: string[] = [];
  for (let min = start * 60; min < end * 60; min += stepMinutes) {
    options.push(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
  }
  return options;
}
