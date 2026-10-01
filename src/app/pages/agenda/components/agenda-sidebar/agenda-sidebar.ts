import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Appointment } from '../../../../core/models/appointment.model';
import { StorageService } from '../../../../core/services/storage.service';
import { CategoryPalette } from '../../../../core/utils/category-palette.util';
import { toIsoDate } from '../../../../core/utils/date.util';

export interface LegendItem {
  name: string;
  icon: string;
  palette: CategoryPalette;
}

interface MiniCalendarDay {
  date: Date;
  dateStr: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  inRange: boolean;
}

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const CURRENCY_FORMATTER = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
// Por debajo de este ancho (portátiles) el panel empieza plegado si el usuario no ha elegido otra cosa
const WIDE_SCREEN_PX = 1536;

@Component({
  selector: 'app-agenda-sidebar',
  imports: [NgClass],
  templateUrl: './agenda-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hidden xl:block shrink-0 overflow-y-auto pb-6' },
})
export class AgendaSidebar {
  private storage = inject(StorageService);

  readonly selectedDate = input.required<Date>();
  /** Rango que se está viendo (yyyy-MM-dd): se usa para el resumen y para marcarlo en el mini calendario */
  readonly rangeStart = input.required<string>();
  readonly rangeEnd = input.required<string>();
  readonly highlightRange = input(true);
  readonly appointments = input.required<Appointment[]>();
  readonly legend = input.required<LegendItem[]>();
  readonly summaryTitle = input('Resumen');
  readonly dateSelected = output<Date>();

  readonly weekDayInitials = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  /** Plegado: la preferencia guardada manda; si no hay, abierto solo en pantallas grandes */
  readonly collapsed = signal(this.storage.getAgendaSidebarCollapsed() ?? window.innerWidth < WIDE_SCREEN_PX);

  /** Mes del mini calendario: sigue a la fecha seleccionada, pero se puede mover con sus propias flechas */
  readonly displayedMonth = linkedSignal(() => {
    const d = this.selectedDate();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  readonly monthLabel = computed(() => MONTH_YEAR_FORMATTER.format(this.displayedMonth()));

  readonly calendarDays = computed<MiniCalendarDay[]>(() => {
    const first = this.displayedMonth();
    const year = first.getFullYear();
    const month = first.getMonth();
    const last = new Date(year, month + 1, 0);
    const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
    const end = new Date(year, month + 1, 6 - ((last.getDay() + 6) % 7));
    const todayStr = toIsoDate(new Date());
    const highlight = this.highlightRange();

    const days: MiniCalendarDay[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const dateStr = toIsoDate(date);
      days.push({
        date,
        dateStr,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: dateStr === todayStr,
        inRange: highlight && dateStr >= this.rangeStart() && dateStr <= this.rangeEnd(),
      });
    }
    return days;
  });

  readonly summary = computed(() => {
    const apps = this.appointments().filter(
      (a) => a.appointmentDate >= this.rangeStart() && a.appointmentDate <= this.rangeEnd(),
    );
    const active = apps.filter((a) => a.status !== 'CANCELLED');
    return {
      total: apps.length,
      confirmed: apps.filter((a) => a.status === 'CONFIRMED').length,
      pending: apps.filter((a) => a.status === 'PENDING').length,
      cancelled: apps.length - active.length,
      income: CURRENCY_FORMATTER.format(active.reduce((sum, a) => sum + (a.price ?? 0), 0)),
    };
  });

  toggleCollapsed() {
    this.collapsed.update((value) => !value);
    this.storage.setAgendaSidebarCollapsed(this.collapsed());
  }

  moveMonth(step: number) {
    const d = this.displayedMonth();
    this.displayedMonth.set(new Date(d.getFullYear(), d.getMonth() + step, 1));
  }

  dayClass(day: MiniCalendarDay): string {
    if (day.isToday) return 'rounded-full bg-blue-600 text-white font-bold';
    if (day.inRange) return 'rounded-md bg-blue-50 text-blue-700 font-semibold';
    return day.inMonth
      ? 'rounded-full text-slate-800 font-medium hover:bg-slate-100'
      : 'rounded-full text-slate-500 hover:bg-slate-100';
  }
}
