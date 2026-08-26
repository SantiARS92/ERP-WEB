import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification',
  imports: [NgClass],
  template: `
    <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-[400px]">
      @for (n of notificationService.notifications(); track n.id) {
        <div 
          class="pointer-events-auto w-full bg-white dark:bg-slate-900 rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 p-4 flex gap-4 animate-in fade-in slide-in-from-right-8 duration-300 relative overflow-hidden group"
          [ngClass]="{
            'border-l-4 border-l-emerald-500': n.type === 'success',
            'border-l-4 border-l-rose-500': n.type === 'error',
            'border-l-4 border-l-blue-500': n.type === 'info',
            'border-l-4 border-l-amber-500': n.type === 'warning'
          }"
        >
          <!-- Glow effect based on type -->
          <div class="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
               [ngClass]="{
                 'bg-emerald-500': n.type === 'success',
                 'bg-rose-500': n.type === 'error',
                 'bg-blue-500': n.type === 'info',
                 'bg-amber-500': n.type === 'warning'
               }">
          </div>

          <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
               [ngClass]="{
                 'bg-emerald-50': n.type === 'success',
                 'bg-rose-50': n.type === 'error',
                 'bg-blue-50': n.type === 'info',
                 'bg-amber-50': n.type === 'warning'
               }">
            <span class="material-symbols-outlined text-[20px]"
                  [ngClass]="{
                    'text-emerald-500': n.type === 'success',
                    'text-rose-500': n.type === 'error',
                    'text-blue-500': n.type === 'info',
                    'text-amber-500': n.type === 'warning'
                  }">
              {{ getIcon(n.type) }}
            </span>
          </div>

          <div class="flex-1 min-w-0 pr-6">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-0.5 truncate">{{ n.title }}</h4>
            <p class="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{{ n.message }}</p>
          </div>

          <button (click)="notificationService.remove(n.id)" 
                  class="absolute top-3 right-3 text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class NotificationComponent {
  notificationService = inject(NotificationService);

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
