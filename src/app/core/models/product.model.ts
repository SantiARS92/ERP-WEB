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
}

export interface ProductPage {
  content: Product[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
