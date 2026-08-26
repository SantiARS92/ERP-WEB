import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { Service } from '../../core/models/service.model';
import { Category } from '../../core/models/category.model';
import { NotificationService } from '../../core/services/notification.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { ServicesStore } from '../../core/state/services.store';

@Component({
  selector: 'app-create-service',
  imports: [FormsModule, RouterLink],
  templateUrl: './create-service.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateService implements OnInit {
  private readonly serviceSignal = signal<Service>({
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    active: true,
    categoryId: 0
  });

  private readonly categoriesSignal = signal<Category[]>([]);

  private serviceApi = inject(ServiceApiService);
  private categoriesStore = inject(CategoriesStore);
  private servicesStore = inject(ServicesStore);
  private router = inject(Router);
  private notification = inject(NotificationService);

  get service() { return this.serviceSignal(); }
  set service(value: Service) { this.serviceSignal.set(value); }

  get categories() { return this.categoriesSignal(); }
  set categories(value: Category[]) { this.categoriesSignal.set(value); }

  ngOnInit() {
    this.categoriesStore.ensureLoaded().subscribe((cats: Category[]) => {
      this.categories = cats;
      // Ensure we select the first category if none is selected
      if (this.categories.length > 0 && (this.service.categoryId === 0 || !this.service.categoryId)) {
        this.service.categoryId = this.categories[0].id!;
      }
    });
  }

  toggleStatus() {
    this.service.active = !this.service.active;
  }

  saveService() {
    // Ensure categoryId is treated as a number
    this.service.categoryId = Number(this.service.categoryId);

    if (!this.service.name || this.service.durationMinutes <= 0 || this.service.price <= 0 || !this.service.categoryId) {
      this.notification.warning('Por favor, rellene todos los campos obligatorios: Nombre, Categoría, Duración (>0) y Precio (>0).');
      return;
    }

    this.serviceApi.createService(this.service).subscribe({
      next: () => {
        this.servicesStore.refresh().subscribe();
        this.router.navigate(['/servicios']);
      },
      error: (err: { status: number; error?: unknown; message: string }) => {
        let errorMsg = 'Error al crear el servicio.\n\n';
        
        if (err.status === 400) {
          errorMsg += 'El servidor rechazó los datos (400 Bad Request).\n';
          if (err.error) {
            errorMsg += 'Detalle: ' + JSON.stringify(err.error, null, 2);
          }
        } else if (err.status === 0) {
          errorMsg += 'No se pudo conectar con el servidor. Verifique que la API esté encendida.';
        } else {
          errorMsg += `Código: ${err.status}\nMensaje: ${err.message}`;
        }
        
        this.notification.error(errorMsg.replace(/\n+/g, ' '));
      }
    });
  }
}
