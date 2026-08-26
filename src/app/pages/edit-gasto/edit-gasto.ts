import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Product } from '../../core/models/product.model';
import { ConfirmService } from '../../core/services/confirm.service';
import { ProductsStore } from '../../core/state/products.store';
import {
  EXPENSE_CATEGORIES,
  buildExpensePayload,
  createExpenseForm,
  expenseToFormValue,
} from '../../shared/forms/expense-form';

@Component({
  selector: 'app-edit-gasto',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-gasto.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGasto implements OnInit {
  private expenseApi = inject(ExpenseApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private productsStore = inject(ProductsStore);

  readonly categories = EXPENSE_CATEGORIES;
  readonly form = createExpenseForm(inject(NonNullableFormBuilder));
  readonly products = signal<Product[]>([]);
  readonly conceptSuggestions = signal<string[]>([]);
  readonly isSubmitting = signal(false);
  readonly isLoading = signal(true);

  private expenseId = 0;

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

  ngOnInit() {
    this.productsStore.ensureLoaded().subscribe(products => this.products.set(products));

    this.expenseId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.expenseId || Number.isNaN(this.expenseId)) {
      this.router.navigate(['/gastos']);
      return;
    }

    this.expenseApi.getExpenseById(this.expenseId).subscribe({
      next: (data) => {
        if (!data) {
          this.router.navigate(['/gastos']);
          return;
        }

        const value = expenseToFormValue(data);
        // El backend guarda el importe total; en suministros el formulario trabaja con precio unitario.
        if (data.category === 'SUPPLIES' && (data.inventoryProductId || data.inventoryProductVariantId)) {
          value.amount = (data.amount || 0) / (data.quantity || 1);
        }
        this.form.setValue(value);
        this.isLoading.set(false);

        if (value.inventoryProductId) {
          this.ensureVariantsLoaded(value.inventoryProductId);
        }
      },
      error: (err: { status: number }) => {
        this.isLoading.set(false);
        if (err.status === 404) this.notification.error('Gasto no encontrado.', 'No existe');
        this.router.navigate(['/gastos']);
      }
    });
  }

  onConceptInput() {
    const query = this.form.controls.concept.value;
    const category = this.form.controls.category.value;
    if (query && query.length >= 2 && category !== 'SUPPLIES') {
      this.expenseApi.getSuggestions(query, category).subscribe({
        next: (data) => this.conceptSuggestions.set(data),
        error: () => this.conceptSuggestions.set([]),
      });
    } else {
      this.conceptSuggestions.set([]);
    }
  }

  selectSuggestion(val: string) {
    this.form.controls.concept.setValue(val);
    this.conceptSuggestions.set([]);
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
    if (product.id) this.ensureVariantsLoaded(product.id);
  }

  private ensureVariantsLoaded(productId: number) {
    const product = this.products().find(p => p.id === productId);
    if (!product?.hasVariants || product.variants?.length) return;

    this.productApi.getProductById(productId).subscribe({
      next: (full) => {
        this.products.update(list =>
          list.map(p => (p.id === productId ? { ...p, variants: full.variants } : p))
        );
      },
      error: () => this.notification.error('No se pudieron cargar las variantes del producto.'),
    });
  }

  saveExpense() {
    const product = this.selectedProduct();

    if (this.form.controls.category.value === 'SUPPLIES' && product) {
      const variant = this.selectedVariant();
      this.form.controls.concept.setValue(
        variant ? `${product.name} - ${variant.variantLabel}` : product.name
      );
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Revise el concepto, el importe (>0), la cantidad (>0) y la fecha.');
      return;
    }

    this.isSubmitting.set(true);

    const payload = buildExpensePayload(this.form.getRawValue(), product?.hasVariants ?? false);

    this.expenseApi.updateExpense(this.expenseId, payload).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Gasto guardado correctamente.', '¡Actualizado!');
        this.router.navigate(['/gastos']);
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  async deleteExpense() {
    const confirmed = await this.confirm.ask('¿Está seguro de eliminar permanentemente este gasto?', {
      title: 'Eliminar gasto',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    this.expenseApi.deleteExpense(this.expenseId).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Gasto eliminado.', 'Eliminado');
        this.router.navigate(['/gastos']);
      },
      error: () => this.notification.error('Ocurrió un error al eliminar el gasto.')
    });
  }
}
