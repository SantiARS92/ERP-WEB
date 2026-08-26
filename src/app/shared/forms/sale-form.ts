import { FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { PaymentMethod, SaleItemType, SaleRequest } from '../../core/models/sale.model';
import { Product } from '../../core/models/product.model';

/** Formularios tipados compartidos por `create-sale` y `edit-sale`. */
export interface SaleLineValue {
  itemType: SaleItemType;
  serviceId: number | null;
  inventoryProductId: number | null;
  inventoryProductVariantId: number | null;
  unitPrice: number | null;
  quantity: number;
}

export interface SaleSharedValue {
  clientId: number | null;
  paymentMethod: PaymentMethod;
  saleDate: string;
  notes: string;
}

export const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'DEBIT_CARD', label: 'Tarjeta de Débito' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'BIZUM', label: 'Bizum' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
];

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function createSaleLineGroup(fb: NonNullableFormBuilder, value?: Partial<SaleLineValue>) {
  return fb.group({
    itemType: fb.control<SaleItemType>(value?.itemType ?? 'SERVICE'),
    serviceId: fb.control<number | null>(value?.serviceId ?? null),
    inventoryProductId: fb.control<number | null>(value?.inventoryProductId ?? null),
    inventoryProductVariantId: fb.control<number | null>(value?.inventoryProductVariantId ?? null),
    unitPrice: fb.control<number | null>(value?.unitPrice ?? null),
    quantity: fb.control(value?.quantity ?? 1, [Validators.required, Validators.min(1)]),
  });
}

export type SaleLineGroup = ReturnType<typeof createSaleLineGroup>;

export function createSaleForm(fb: NonNullableFormBuilder) {
  return fb.group({
    clientId: fb.control<number | null>(null, [Validators.required]),
    paymentMethod: fb.control<PaymentMethod>('CASH', [Validators.required]),
    saleDate: fb.control(todayIsoDate(), [Validators.required]),
    notes: fb.control(''),
    lines: fb.array<SaleLineGroup>([createSaleLineGroup(fb)]),
  });
}

export type SaleFormGroup = ReturnType<typeof createSaleForm>;

/** Suma de `cantidad × precio` de todas las líneas, con caída al precio del servicio. */
export function computeSaleTotal(
  lines: readonly Partial<SaleLineValue>[],
  servicePriceOf: (serviceId: number | null | undefined) => number
): number {
  return lines.reduce((sum, line) => {
    const qty = Number(line.quantity ?? 0);
    const price = Number(line.unitPrice ?? 0) || (line.itemType === 'SERVICE' ? servicePriceOf(line.serviceId) : 0);
    return sum + qty * price;
  }, 0);
}

export function buildSalePayload(
  shared: SaleSharedValue,
  line: SaleLineValue,
  product: Product | null
): SaleRequest {
  const payload: SaleRequest = {
    clientId: shared.clientId != null ? Number(shared.clientId) : null,
    itemType: line.itemType,
    quantity: Number(line.quantity),
    paymentMethod: shared.paymentMethod,
    saleDate: shared.saleDate,
    saleTime: '00:00:00',
    notes: shared.notes,
  };

  if (line.unitPrice) payload.unitPrice = Number(line.unitPrice);

  if (line.itemType === 'SERVICE') {
    payload.serviceId = line.serviceId != null ? Number(line.serviceId) : null;
  } else {
    payload.inventoryProductId = line.inventoryProductId != null ? Number(line.inventoryProductId) : null;
    payload.inventoryProductVariantId =
      product?.hasVariants && line.inventoryProductVariantId != null
        ? Number(line.inventoryProductVariantId)
        : null;
  }

  return payload;
}

export type AnySaleLineGroup = FormGroup<SaleLineGroup['controls']>;

/**
 * Variante de una sola línea (edición de una venta ya registrada).
 * Comparte campos con `createSaleForm` pero sin `FormArray`.
 */
export function createSingleSaleForm(fb: NonNullableFormBuilder) {
  return fb.group({
    clientId: fb.control<number | null>(null, [Validators.required]),
    paymentMethod: fb.control<PaymentMethod>('CASH', [Validators.required]),
    saleDate: fb.control(todayIsoDate(), [Validators.required]),
    notes: fb.control(''),
    itemType: fb.control<SaleItemType>('SERVICE'),
    serviceId: fb.control<number | null>(null),
    inventoryProductId: fb.control<number | null>(null),
    inventoryProductVariantId: fb.control<number | null>(null),
    unitPrice: fb.control<number | null>(null),
    quantity: fb.control(1, [Validators.required, Validators.min(1)]),
  });
}

export type SingleSaleFormGroup = ReturnType<typeof createSingleSaleForm>;
export type SingleSaleFormValue = ReturnType<SingleSaleFormGroup['getRawValue']>;

export function splitSingleSaleValue(value: SingleSaleFormValue): { shared: SaleSharedValue; line: SaleLineValue } {
  return {
    shared: {
      clientId: value.clientId,
      paymentMethod: value.paymentMethod,
      saleDate: value.saleDate,
      notes: value.notes,
    },
    line: {
      itemType: value.itemType,
      serviceId: value.serviceId,
      inventoryProductId: value.inventoryProductId,
      inventoryProductVariantId: value.inventoryProductVariantId,
      unitPrice: value.unitPrice,
      quantity: value.quantity,
    },
  };
}

