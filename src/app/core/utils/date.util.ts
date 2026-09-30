export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Hora en formato 24 h: '09:30:00' o '09:30' -> '09:30' */
export function formatTime24(time: string): string {
  return time ? time.slice(0, 5) : '';
}

