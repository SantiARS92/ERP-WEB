import {
  Component, Input, Output, EventEmitter,
  OnInit, inject, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, InventoryVariant, ProductType } from '../../../../core/models/product.model';
import { Category } from '../../../../core/models/category.model';
import { VariantConfigComponent } from '../variant-config/variant-config';

@Component({
  selector: 'app-inventory-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, VariantConfigComponent],
  templateUrl: './inventory-form-modal.html',
})
export class InventoryFormModalComponent implements OnInit {
  /** If provided, we are in EDIT mode */
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];

  @Output() save = new EventEmitter<Product>();
  @Output() delete = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  private cdr = inject(ChangeDetectorRef);

  // Form state
  name = '';
  description = '';
  categoryId: number | null = null;
  sku = '';
  stock = 0;
  minimumStock = 10;
  purchasePrice = 0;
  hasVariants = false;
  variants: InventoryVariant[] = [];

  isEditMode = false;

  get statusLabel(): { label: string; cls: string } {
    if (this.hasVariants) return { label: 'Variantes', cls: 'text-blue-500' };
    if (this.stock <= 0) return { label: 'Agotado', cls: 'text-red-500' };
    if (this.stock <= this.minimumStock) return { label: 'Bajo Stock', cls: 'text-orange-500' };
    return { label: 'En Stock', cls: 'text-emerald-500' };
  }

  get totalVariantStock(): number {
    return this.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
  }

  ngOnInit() {
    if (this.product) {
      this.isEditMode = true;
      this.name = this.product.name;
      this.description = this.product.description ?? '';
      this.categoryId = this.product.categoryId;
      this.sku = this.product.sku ?? '';
      this.stock = this.product.stock;
      this.minimumStock = this.product.minimumStock;
      this.purchasePrice = this.product.purchasePrice ?? 0;
      this.hasVariants = this.product.hasVariants ?? false;
      this.variants = this.product.variants ? this.product.variants.map(v => ({ ...v })) : [];
    }
  }

  onToggleVariants() {
    if (this.hasVariants && this.isEditMode && this.product && !this.product.hasVariants && this.product.stock > 0) {
      alert('No se puede convertir un producto simple con stock a un producto con variantes.');
      this.hasVariants = false;
      return;
    }
  }

  onVariantsChange(variants: InventoryVariant[]) {
    this.variants = variants;
    this.cdr.detectChanges();
  }

  getVariantStatus(v: InventoryVariant): { label: string; cls: string } {
    if (v.stock <= 0) return { label: 'Agotado', cls: 'text-red-500' };
    if (v.stock <= v.minimumStock) return { label: 'Bajo Stock', cls: 'text-orange-500' };
    return { label: 'En Stock', cls: 'text-emerald-500' };
  }

  onClose() {
    this.close.emit();
  }

  onDelete() {
    if (this.product?.id && confirm('¿Eliminar este producto permanentemente?')) {
      this.delete.emit(this.product.id);
    }
  }

  onSave() {
    if (!this.name.trim()) return;

    const payload: Product = {
      id: this.product?.id,
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      categoryId: this.categoryId ?? 0,
      sku: this.hasVariants ? undefined : (this.sku.trim() || undefined),
      stock: this.hasVariants ? 0 : this.stock,
      minimumStock: this.hasVariants ? 0 : this.minimumStock,
      purchasePrice: this.hasVariants ? undefined : this.purchasePrice,
      status: 'IN_STOCK',
      productType: this.hasVariants ? 'VARIANT' : 'SIMPLE',
      hasVariants: this.hasVariants,
      variants: this.hasVariants ? this.variants.map(v => ({
        ...v,
        active: v.active ?? true
      })) : [],
    };

    this.save.emit(payload);
  }

  trackByIndex(i: number) { return i; }
}
