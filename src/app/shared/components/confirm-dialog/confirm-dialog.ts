import { NgClass } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [NgClass],
  template: `
    @if (confirmService.dialog(); as dialog) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
        <div
          class="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'confirm-title'"
          [attr.aria-describedby]="'confirm-message'"
        >
          <div class="border-b border-slate-100 px-6 py-5">
            <h2 id="confirm-title" class="text-lg font-bold text-slate-900">{{ dialog.title }}</h2>
          </div>

          <div class="px-6 py-5">
            <p id="confirm-message" class="text-sm leading-6 text-slate-600">{{ dialog.message }}</p>
          </div>

          <div class="flex justify-end gap-3 bg-slate-50 px-6 py-5">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              (click)="confirmService.cancel()"
            >
              {{ dialog.cancelText }}
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
              [ngClass]="dialog.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'"
              (click)="confirmService.confirm()"
            >
              {{ dialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class ConfirmDialogComponent {
  protected confirmService = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmService.dialog()) {
      this.confirmService.cancel();
    }
  }
}
