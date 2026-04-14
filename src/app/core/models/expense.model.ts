export type ExpenseCategory = 'SUPPLIES' | 'SERVICES' | 'OTHER';

export interface ExpenseRequest {
  concept: string;
  category: ExpenseCategory;
  amount: number;
  quantity: number;
  expenseDate: string;
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
