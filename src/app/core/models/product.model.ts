import { Page } from './page.model';

export type ProductType = 'SIMPLE' | 'VARIANT';

export interface InventoryVariant {
  id?: number;
  variantLabel: string;
  sku?: string;
  stock: number;
  minimumStock: number;
  purchasePrice?: number;
  status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  active?: boolean;
  attributes?: Record<string, string>;
}

export interface VariantAttribute {
  name: string;
  values: string[];
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  stock: number;
  minimumStock: number;
  sku?: string;
  purchasePrice?: number;
  active?: boolean;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  statusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
  productType?: ProductType;
  hasVariants?: boolean;
  variantCount?: number;
  variants?: InventoryVariant[];
}

export type ProductPage = Page<Product>;
