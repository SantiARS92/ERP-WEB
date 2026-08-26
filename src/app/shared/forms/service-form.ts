import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Service } from '../../core/models/service.model';

/** Formulario tipado compartido por `create-service` y `edit-service`. */
export interface ServiceFormValue {
  name: string;
  description: string;
  categoryId: number;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export function createServiceForm(fb: NonNullableFormBuilder) {
  return fb.group({
    name: fb.control('', [Validators.required, Validators.maxLength(150)]),
    description: fb.control(''),
    categoryId: fb.control(0, [Validators.required, Validators.min(1)]),
    durationMinutes: fb.control(60, [Validators.required, Validators.min(1)]),
    price: fb.control(0, [Validators.required, Validators.min(0.01)]),
    active: fb.control(true),
  });
}

export type ServiceFormGroup = ReturnType<typeof createServiceForm>;

export function serviceToFormValue(service: Service): ServiceFormValue {
  return {
    name: service.name ?? '',
    description: service.description ?? '',
    categoryId: service.category?.id ?? service.categoryId ?? 0,
    durationMinutes: service.durationMinutes ?? 60,
    price: service.price ?? 0,
    active: service.active ?? true,
  };
}

export function buildServicePayload(value: ServiceFormValue): Service {
  return {
    name: value.name.trim(),
    description: value.description.trim(),
    categoryId: Number(value.categoryId),
    durationMinutes: Number(value.durationMinutes),
    price: Number(value.price),
    active: value.active,
  };
}
