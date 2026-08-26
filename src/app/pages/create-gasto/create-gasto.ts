import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Product } from '../../core/models/product.model';
import { ProductsStore } from '../../core/state/products.store';
import {
  EXPENSE_CATEGORIES,
  buildExpensePayload,
  createExpenseForm,
} from '../../shared/forms/expense-form';

@Component({
  selector: 'app-create-gasto',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './create-gasto.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateGasto implements OnInit {
  private expenseApi = inject(ExpenseApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private productsStore = inject(ProductsStore);

  readonly categories = EXPENSE_CATEGORIES;
  readonly form = createExpenseForm(inject(NonNullableFormBuilder));
  readonly products = signal<Product[]>([]);
  readonly isSubmitting = signal(false);

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly selectedProduct = computed<Product | null>(() => {
    const id = Number(this.value().inventoryProductId ?? 0);
    if (!id) return null;
    return this.products().find(p => p.id === id) ?? null;
  });

  readonly selectedVariant = computed(() => {
    const id = Number(this.value().inventoryProductVariantId ?? 0);
    if (!id) return null;
    return this.selectedProduct()?.variants?.find(v => v.id === id) ?? null;
  });

  readonly totalGasto = computed(() => {
    const v = this.value();
    const amount = Number(v.amount ?? 0);
    const qty = Number(v.quantity ?? 1) || 1;
    return v.category === 'SUPPLIES' && v.inventoryProductId ? qty * amount : amount;
  });

  readonly stockFinal = computed(() => {
    const v = this.value();
    if (v.category !== 'SUPPLIES') return 0;
    const variant = this.selectedVariant();
    const product = this.selectedProduct();
    if (!variant && !product) return 0;
    const currentStock = variant ? variant.stock : (product?.stock ?? 0);
    return currentStock + (Number(v.quantity ?? 1) || 1);
  });

  ngOnInit(): void {
    this.productsStore.ensureLoaded().subscribe(products => this.products.set(products));
  }

  onCategoryChange() {
    if (this.form.controls.category.value !== 'SUPPLIES') {
      this.form.patchValue({ inventoryProductId: null, inventoryProductVariantId: null });
    }
  }

  onProductChange() {
    this.form.controls.inventoryProductVariantId.setValue(null);

    const product = this.selectedProduct();
    if (!product) return;

    if (!this.form.controls.concept.value) {
      this.form.controls.concept.setValue(product.name);
    }

    if (product.hasVariants && !product.variants?.length && product.id) {
      this.productApi.getProductById(product.id).subscribe({
        next: (full) => {
          this.products.update(list =>
            list.map(p => (p.id === product.id ? { ...p, variants: full.variants } : p))
          );
        },
        error: () => this.notification.error('No se pudieron cargar las variantes del producto.'),
      });
    }
  }

  onVariantChange() {
    const variant = this.selectedVariant();
    if (variant && !this.form.controls.amount.value && variant.purchasePrice) {
      this.form.controls.amount.setValue(variant.purchasePrice);
    }
  }

  registerExpense() {
    const product = this.selectedProduct();

    if (this.form.controls.category.value === 'SUPPLIES') {
      if (!this.form.controls.inventoryProductId.value) {
        this.notification.warning('Para suministros, debe seleccionar un producto del inventario.');
        return;
      }
      if (product?.hasVariants && !this.form.controls.inventoryProductVariantId.value) {
        this.notification.warning('Debe seleccionar una variante del producto.');
        return;
      }
      if (product) {
        const variant = this.selectedVariant();
        this.form.controls.concept.setValue(
          variant ? `${product.name} - ${variant.variantLabel}` : product.name
        );
      }
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Revise el concepto, el importe (>0) y la fecha.');
      return;
    }

    this.isSubmitting.set(true);

    const payload = buildExpensePayload(this.form.getRawValue(), product?.hasVariants ?? false);

    this.expenseApi.createExpense(payload).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Gasto registrado correctamente.', '¡Éxito!');
        this.router.navigate(['/gastos']);
      },
      error: () => this.isSubmitting.set(false),
    });
  }
}
