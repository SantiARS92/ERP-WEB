import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { Service } from '../../core/models/service.model';
import { Category } from '../../core/models/category.model';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { ServicesStore } from '../../core/state/services.store';

@Component({
  selector: 'app-edit-service',
  imports: [FormsModule, RouterLink],
  templateUrl: './edit-service.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditService implements OnInit {
  private readonly serviceSignal = signal<Service>({
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    active: true,
    categoryId: 0
  });
  serviceId!: number;
  private readonly categoriesSignal = signal<Category[]>([]);

  private serviceApi = inject(ServiceApiService);
  private categoriesStore = inject(CategoriesStore);
  private servicesStore = inject(ServicesStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);

  get service() { return this.serviceSignal(); }
  set service(value: Service) { this.serviceSignal.set(value); }

  get categories() { return this.categoriesSignal(); }
  set categories(value: Category[]) { this.categoriesSignal.set(value); }

  ngOnInit() {
    this.categoriesStore.ensureLoaded().subscribe(cats => {
      this.categories = cats;
    });
    this.serviceId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.serviceId) {
      this.serviceApi.getServiceById(this.serviceId).subscribe({
        next: (data) => {
          this.service = data;
          if (data.category && data.category.id) {
            this.service.categoryId = data.category.id;
          }
        },
        error: (err) => {
          if (err.status === 404) {
             this.notification.error('Servicio no encontrado');
             this.router.navigate(['/servicios']);
           }
        }
      });
    }
  }

  toggleStatus() {
    this.service.active = !this.service.active;
  }

  saveChanges() {
    if (!this.service.name || this.service.durationMinutes <= 0 || this.service.price <= 0 || !this.service.categoryId) {
      this.notification.warning('Por favor, rellene todos los campos obligatorios: Nombre, Categoría, Duración (>0) y Precio (>0).');
      return;
    }

    this.serviceApi.updateService(this.serviceId, this.service).subscribe({
      next: () => {
        this.servicesStore.refresh().subscribe();
        this.router.navigate(['/servicios']);
      },
      error: (err) => {
        if (err.status === 400) {
          this.notification.error('Datos inválidos o faltantes. Revise Nombre, Categoría, Duración o Precio.');
        } else if (err.status === 404) {
          this.notification.error('No se pudo encontrar el servicio para actualizar.');
        }
      }
    });
  }

  async deleteService() {
    const confirmed = await this.confirm.ask('¿Está seguro de eliminar este servicio?', {
      title: 'Eliminar servicio',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.serviceApi.deleteService(this.serviceId).subscribe({
      next: () => {
        this.servicesStore.refresh().subscribe();
        this.router.navigate(['/servicios']);
      },
      error: () => this.notification.error('Ocurrió un error al eliminar el servicio.')
    });
  }
}
