import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './shared/components/notification/notification';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog';
import { FaviconService } from './core/services/favicon.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('AppPimes');
  private favicon = inject(FaviconService);
}
