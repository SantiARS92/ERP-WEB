import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ExpenseCategory, ExpenseRequest, ExpenseResponse } from '../../core/models/expense.model';

/** Formulario tipado compartido por `create-gasto` y `edit-gasto`. */
export interface ExpenseFormValue {
  concept: string;
  category: ExpenseCategory;
  amount: number;
  quantity: number;
  expenseDate: string;
  notes: string;
  inventoryProductId: number | null;
  inventoryProductVariantId: number | null;
}

export const EXPENSE_CATEGORIES: readonly { value: ExpenseCategory; label: string }[] = [
  { value: 'SUPPLIES', label: 'Suministros' },
  { value: 'SERVICES', label: 'Servicios' },
  { value: 'OTHER', label: 'Otros' },
];

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function createExpenseForm(fb: NonNullableFormBuilder) {
  return fb.group({
    concept: fb.control('', [Validators.required, Validators.maxLength(255)]),
    category: fb.control<ExpenseCategory>('SUPPLIES', [Validators.required]),
    amount: fb.control(0, [Validators.required, Validators.min(0.01)]),
    quantity: fb.control(1, [Validators.required, Validators.min(1)]),
    expenseDate: fb.control(todayIsoDate(), [Validators.required]),
    notes: fb.control(''),
    inventoryProductId: fb.control<number | null>(null),
    inventoryProductVariantId: fb.control<number | null>(null),
  });
}

export type ExpenseFormGroup = ReturnType<typeof createExpenseForm>;

export function expenseToFormValue(expense: ExpenseResponse): ExpenseFormValue {
  return {
    concept: expense.concept ?? '',
    category: expense.category,
    amount: expense.amount ?? 0,
    quantity: expense.quantity ?? 1,
    expenseDate: expense.expenseDate ?? todayIsoDate(),
    notes: expense.notes ?? '',
    inventoryProductId: expense.inventoryProductId ?? null,
    inventoryProductVariantId: expense.inventoryProductVariantId ?? null,
  };
}

/**
 * Normaliza el valor del formulario al contrato del backend.
 * Fuera de `SUPPLIES` no se envía vinculación de inventario.
 */
export function buildExpensePayload(value: ExpenseFormValue, productHasVariants: boolean): ExpenseRequest {
  const base: ExpenseRequest = {
    concept: value.concept.trim(),
    category: value.category,
    amount: Number(value.amount),
    quantity: Number(value.quantity) || 1,
    expenseDate: value.expenseDate,
    notes: value.notes.trim(),
  };

  if (value.category !== 'SUPPLIES') {
    return base;
  }

  return {
    ...base,
    inventoryProductId: value.inventoryProductId != null ? Number(value.inventoryProductId) : null,
    inventoryProductVariantId:
      productHasVariants && value.inventoryProductVariantId != null
        ? Number(value.inventoryProductVariantId)
        : null,
  };
}
