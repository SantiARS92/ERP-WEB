import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { Category } from '../../core/models/category.model';
import { NotificationService } from '../../core/services/notification.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { ServicesStore } from '../../core/state/services.store';
import { buildServicePayload, createServiceForm } from '../../shared/forms/service-form';

@Component({
  selector: 'app-create-service',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-service.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateService implements OnInit {
  private serviceApi = inject(ServiceApiService);
  private categoriesStore = inject(CategoriesStore);
  private servicesStore = inject(ServicesStore);
  private router = inject(Router);
  private notification = inject(NotificationService);

  readonly form = createServiceForm(inject(NonNullableFormBuilder));
  readonly categories = signal<Category[]>([]);

  ngOnInit() {
    this.categoriesStore.ensureLoaded().subscribe((cats: Category[]) => {
      this.categories.set(cats);
      if (cats.length > 0 && !this.form.controls.categoryId.value) {
        this.form.controls.categoryId.setValue(cats[0].id!);
      }
    });
  }

  toggleStatus() {
    const control = this.form.controls.active;
    control.setValue(!control.value);
  }

  saveService() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Por favor, rellene todos los campos obligatorios: Nombre, Categoría, Duración (>0) y Precio (>0).');
      return;
    }

    this.serviceApi.createService(buildServicePayload(this.form.getRawValue())).subscribe({
      next: () => {
        this.servicesStore.refresh().subscribe();
        this.router.navigate(['/servicios']);
      },
      error: (err: { status: number; error?: unknown; message: string }) => {
        if (err.status === 400) {
          this.notification.error('El servidor rechazó los datos del servicio. Revisa nombre, categoría, duración y precio.');
        } else if (err.status === 0) {
          this.notification.error('No se pudo conectar con el servidor.');
        } else {
          this.notification.error(`No se pudo crear el servicio (${err.status}).`);
        }
      }
    });
  }
}
