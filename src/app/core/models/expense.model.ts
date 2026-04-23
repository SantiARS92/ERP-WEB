export type ExpenseCategory = 'SUPPLIES' | 'SERVICES' | 'OTHER';

export interface ExpenseRequest {
  concept: string;
  category: ExpenseCategory;
  amount: number;
  quantity: number;
  expenseDate: string;
  inventoryProductId?: number | null;
  inventoryProductVariantId?: number | null;
  notes?: string;
}

export interface ExpenseResponse {
  id: number;
  expenseDate: string;
  concept: string;
  category: ExpenseCategory;
  categoryLabel: string;
  quantity: number;
  amount: number;
  inventoryProductId?: number | null;
  inventoryProductVariantId?: number | null;
  inventoryProductVariantLabel?: string;
  inventoryProductVariantSku?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpensePage {
  content: ExpenseResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
