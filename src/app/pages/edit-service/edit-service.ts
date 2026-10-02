import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { Category } from '../../core/models/category.model';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { ServicesStore } from '../../core/state/services.store';
import { buildServicePayload, createServiceForm, serviceToFormValue } from '../../shared/forms/service-form';
import { HttpContext } from '@angular/common/http';
import { silentError } from '../../core/http/http-contexts';

@Component({
  selector: 'app-edit-service',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-service.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditService implements OnInit {
  private serviceApi = inject(ServiceApiService);
  private categoriesStore = inject(CategoriesStore);
  private servicesStore = inject(ServicesStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);

  readonly form = createServiceForm(inject(NonNullableFormBuilder));
  readonly categories = signal<Category[]>([]);

  private serviceId = 0;

  ngOnInit() {
    this.categoriesStore.ensureLoaded().subscribe(cats => this.categories.set(cats));

    this.serviceId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.serviceId) return;

    this.serviceApi.getServiceById(this.serviceId).subscribe({
      next: (data) => this.form.setValue(serviceToFormValue(data)),
      error: (err: { status: number }) => {
        if (err.status === 404) {
          this.notification.error('Servicio no encontrado');
          this.router.navigate(['/servicios']);
        }
      }
    });
  }

  toggleStatus() {
    const control = this.form.controls.active;
    control.setValue(!control.value);
  }

  saveChanges() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Por favor, rellene todos los campos obligatorios: Nombre, Categoría, Duración (>0) y Precio (>0).');
      return;
    }

    this.serviceApi.updateService(this.serviceId, buildServicePayload(this.form.getRawValue())).subscribe({
      next: () => {
        this.servicesStore.refresh().subscribe();
        this.router.navigate(['/servicios']);
      },
      error: (err: { status: number }) => {
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

    if (!confirmed) return;

    this.serviceApi.deleteService(this.serviceId, new HttpContext().set(silentError, true)).subscribe({
      next: () => {
        this.servicesStore.refresh().subscribe();
        this.router.navigate(['/servicios']);
      },
      error: (err) => this.notification.error(err.error?.message || 'Ocurrió un error al eliminar el servicio.')
    });
  }
}
