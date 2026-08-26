import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private readonly dialogSignal = signal<ConfirmDialogState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  readonly dialog = this.dialogSignal.asReadonly();

  ask(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    this.resolve(false);

    this.dialogSignal.set({
      title: options.title ?? 'Confirmar acción',
      message,
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
      danger: options.danger ?? false,
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirm(): void {
    this.resolve(true);
  }

  cancel(): void {
    this.resolve(false);
  }

  private resolve(value: boolean): void {
    this.dialogSignal.set(null);
    this.resolver?.(value);
    this.resolver = null;
  }
}
