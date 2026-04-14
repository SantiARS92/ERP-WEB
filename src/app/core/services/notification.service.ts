import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private nextId = 0;
  notifications = signal<Notification[]>([]);

  show(message: string, type: NotificationType = 'info', title?: string) {
    const id = this.nextId++;
    const notification: Notification = { id, message, type, title };
    
    this.notifications.update(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.remove(id);
    }, 5000);
  }

  success(message: string, title: string = 'Éxito') {
    this.show(message, 'success', title);
  }

  error(message: string, title: string = 'Error') {
    this.show(message, 'error', title);
  }

  info(message: string, title: string = 'Información') {
    this.show(message, 'info', title);
  }

  warning(message: string, title: string = 'Advertencia') {
    this.show(message, 'warning', title);
  }

  remove(id: number) {
    this.notifications.update(prev => prev.filter(n => n.id !== id));
  }
}
