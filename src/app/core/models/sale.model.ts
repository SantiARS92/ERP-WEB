import { Page } from './page.model';

export type SaleSourceType = 'MANUAL' | 'APPOINTMENT';
export type SaleItemType = 'SERVICE' | 'PRODUCT';
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'BIZUM';

export interface SaleResponse {
  id: number;
  sourceType: SaleSourceType;
  appointmentId: number | null;
  clientId: number | null;
  clientName: string;
  itemType: SaleItemType;
  inventoryProductId: number | null;
  inventoryProductVariantId?: number | null;
  inventoryProductVariantLabel?: string;
  inventoryProductVariantSku?: string;
  serviceId: number | null;
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | null;
  saleDate: string; // yyyy-MM-dd
  saleTime?: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaleRequest {
  clientId?: number | null;
  itemType: SaleItemType;
  inventoryProductId?: number | null;
  inventoryProductVariantId?: number | null;
  serviceId?: number | null;
  itemName?: string;
  unitPrice?: number;
  quantity: number;
  paymentMethod?: PaymentMethod | null;
  saleDate?: string;
  saleTime?: string;
  notes?: string | null;
}

export type SalePage = Page<SaleResponse>;
