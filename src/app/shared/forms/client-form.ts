import { AbstractControl, NonNullableFormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Client } from '../../core/models/client.model';

/**
 * Formulario tipado compartido por `create-client` y `edit-client`.
 * Los campos fiscales solo son obligatorios cuando `admiteFacturas` está activo.
 */
export interface ClientFormValue {
  fullName: string;
  phone: string;
  email: string;
  admiteFacturas: boolean;
  direccion: string;
  cifNif: string;
}

function billingValidator(group: AbstractControl): ValidationErrors | null {
  const value = group.value as ClientFormValue;
  if (!value?.admiteFacturas) return null;
  const missing = !value.direccion?.trim() || !value.cifNif?.trim();
  return missing ? { billingRequired: true } : null;
}

export function createClientForm(fb: NonNullableFormBuilder) {
  return fb.group(
    {
      fullName: fb.control('', [Validators.required, Validators.maxLength(150)]),
      phone: fb.control('', [Validators.required, Validators.maxLength(30)]),
      email: fb.control('', [Validators.email]),
      admiteFacturas: fb.control(false),
      direccion: fb.control(''),
      cifNif: fb.control(''),
    },
    { validators: billingValidator }
  );
}

export type ClientFormGroup = ReturnType<typeof createClientForm>;

export function clientToFormValue(client: Client): ClientFormValue {
  return {
    fullName: client.fullName ?? '',
    phone: client.phone ?? '',
    email: client.email ?? '',
    admiteFacturas: client.admiteFacturas ?? false,
    direccion: client.direccion ?? '',
    cifNif: client.cifNif ?? '',
  };
}

export function buildClientPayload(value: ClientFormValue): Omit<Client, 'id'> {
  return {
    fullName: value.fullName.trim(),
    phone: value.phone.trim(),
    email: value.email.trim() || null,
    admiteFacturas: value.admiteFacturas,
    direccion: value.admiteFacturas ? value.direccion.trim() || null : null,
    cifNif: value.admiteFacturas ? value.cifNif.trim() || null : null,
  };
}
