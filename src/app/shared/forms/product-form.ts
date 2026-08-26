import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { InventoryVariant, Product } from '../../core/models/product.model';

export function createProductForm(fb: NonNullableFormBuilder) {
  return fb.group({
    name: fb.control('', [Validators.required, Validators.maxLength(150)]),
    categoryId: fb.control(0, [Validators.required, Validators.min(1)]),
    sku: fb.control(''),
    stock: fb.control(0, [Validators.min(0)]),
    minimumStock: fb.control(10, [Validators.min(0)]),
    purchasePrice: fb.control<number | null>(0),
    description: fb.control(''),
    hasVariants: fb.control(false),
  });
}

export type ProductFormGroup = ReturnType<typeof createProductForm>;

export function productToFormValue(product: Product) {
  return {
    name: product.name ?? '',
    categoryId: product.categoryId ?? 0,
    sku: product.sku ?? '',
    stock: product.stock ?? 0,
    minimumStock: product.minimumStock ?? 10,
    purchasePrice: product.purchasePrice ?? 0,
    description: product.description ?? '',
    hasVariants: product.hasVariants ?? false,
  };
}

export function buildProductPayload(
  existing: Product,
  value: ReturnType<ProductFormGroup['getRawValue']>,
  variants: InventoryVariant[]
): Product {
  const hasVariants = value.hasVariants;

  return {
    ...existing,
    name: value.name.trim(),
    categoryId: Number(value.categoryId),
    description: value.description.trim() || undefined,
    sku: hasVariants ? undefined : value.sku.trim() || undefined,
    stock: hasVariants ? variants.reduce((acc, variant) => acc + (variant.stock ?? 0), 0) : Number(value.stock),
    minimumStock: hasVariants ? 0 : Number(value.minimumStock),
    purchasePrice: hasVariants ? undefined : value.purchasePrice ?? undefined,
    productType: hasVariants ? 'VARIANT' : 'SIMPLE',
    hasVariants,
    variants: hasVariants
      ? variants.map((variant) => ({
          ...variant,
          active: variant.active ?? true,
        }))
      : [],
  };
}
