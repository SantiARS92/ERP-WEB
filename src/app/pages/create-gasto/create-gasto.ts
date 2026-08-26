import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExpenseRequest, ExpenseCategory } from '../../core/models/expense.model';
import { Product, InventoryVariant } from '../../core/models/product.model';

@Component({
  selector: 'app-create-gasto',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './create-gasto.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateGasto implements OnInit {
  private expenseApi = inject(ExpenseApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  private readonly productsSignal = signal<Product[]>([]);
  private readonly selectedProductSignal = signal<Product | null>(null);
  private readonly selectedVariantSignal = signal<InventoryVariant | null>(null);
  
  totalGasto = 0;
  stockFinal = 0;
  
  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'SUPPLIES', label: 'Suministros' },
    { value: 'SERVICES', label: 'Servicios'   },
    { value: 'OTHER',    label: 'Otros'        },
  ];

  newExpense: ExpenseRequest = {
    concept: '',
    category: 'SUPPLIES',
    amount: 0,
    quantity: 1,
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  private readonly isSubmittingSignal = signal(false);

  get products() { return this.productsSignal(); }
  set products(value: Product[]) { this.productsSignal.set(value); }

  get selectedProduct() { return this.selectedProductSignal(); }
  set selectedProduct(value: Product | null) { this.selectedProductSignal.set(value); }

  get selectedVariant() { return this.selectedVariantSignal(); }
  set selectedVariant(value: InventoryVariant | null) { this.selectedVariantSignal.set(value); }

  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }

  ngOnInit(): void {
    this.productApi.getProducts({ size: 500 }).subscribe({
      next: (res) => {
        this.products = res.content || [];
      }
    });
  }

  onCategoryChange() {
    if (this.newExpense.category !== 'SUPPLIES') {
      this.selectedProduct = null;
      this.selectedVariant = null;
      this.newExpense.inventoryProductId = undefined;
      this.newExpense.inventoryProductVariantId = undefined;
    }
    this.calculateSummary();
  }

  onProductChange() {
    const productId = Number(this.newExpense.inventoryProductId);
    if (!productId) {
      this.selectedProduct = null;
      this.selectedVariant = null;
      this.newExpense.inventoryProductVariantId = undefined;
      return;
    }

    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.selectedProduct = product;
      this.selectedVariant = null;
      this.newExpense.inventoryProductVariantId = undefined;
      
      // Auto-set concept if empty
      if (!this.newExpense.concept) {
        this.newExpense.concept = product.name;
      }

      if (product.hasVariants && (!product.variants || product.variants.length === 0)) {
        this.productApi.getProductById(productId).subscribe({
          next: (fullProduct) => {
            product.variants = fullProduct.variants;
          },
          error: (err) => console.error('Error loading product details:', err)
        });
      }
    }
    this.calculateSummary();
  }

  onVariantChange() {
    const variantId = Number(this.newExpense.inventoryProductVariantId);
    if (this.selectedProduct && variantId) {
      this.selectedVariant = this.selectedProduct.variants?.find(v => v.id === variantId) || null;
      if (this.selectedVariant) {
        // Auto-set purchase price if 0
        if (!this.newExpense.amount && this.selectedVariant.purchasePrice) {
          this.newExpense.amount = this.selectedVariant.purchasePrice;
        }
      }
    } else {
      this.selectedVariant = null;
    }
    this.calculateSummary();
  }

  calculateSummary() {
    const qty = Number(this.newExpense.quantity || 1);
    const amount = Number(this.newExpense.amount || 0);
    
    if (this.newExpense.category === 'SUPPLIES' && this.newExpense.inventoryProductId) {
      this.totalGasto = qty * amount;
    } else {
      this.totalGasto = amount;
    }

    if (this.newExpense.category === 'SUPPLIES' && (this.selectedProduct || this.selectedVariant)) {
      const currentStock = this.selectedVariant ? this.selectedVariant.stock : (this.selectedProduct?.stock || 0);
      this.stockFinal = currentStock + qty;
    } else {
      this.stockFinal = 0;
    }
  }

  registerExpense() {
    if (this.newExpense.category === 'SUPPLIES') {
      if (!this.newExpense.inventoryProductId) {
        this.notification.warning('Para suministros, debe seleccionar un producto del inventario.');
        return;
      }
      if (this.selectedProduct?.hasVariants && !this.newExpense.inventoryProductVariantId) {
        this.notification.warning('Debe seleccionar una variante del producto.');
        return;
      }
      
      // Auto-set concept if still empty or just sync with product name
      if (this.selectedProduct) {
        let concept = this.selectedProduct.name;
        if (this.selectedVariant) {
          concept += ` - ${this.selectedVariant.variantLabel}`;
        }
        this.newExpense.concept = concept;
      }
    }

    if (!this.newExpense.amount || this.newExpense.amount <= 0) {
      this.notification.warning('El importe debe ser mayor a 0.');
      return;
    }

    const payload: any = {
      ...this.newExpense,
      amount: Number(this.newExpense.amount),
      quantity: Number(this.newExpense.quantity || 1)
    };

    if (this.newExpense.category === 'SUPPLIES') {
      payload.inventoryProductId = Number(this.newExpense.inventoryProductId);
      if (this.selectedProduct?.hasVariants) {
        payload.inventoryProductVariantId = Number(this.newExpense.inventoryProductVariantId);
      } else {
        // Simple product
        payload.inventoryProductVariantId = null;
      }
    } else {
      // SERVICES or OTHER: NO inventory IDs
      delete payload.inventoryProductId;
      delete payload.inventoryProductVariantId;
    }

    this.isSubmitting = true;

    this.expenseApi.createExpense(payload).subscribe({
      next: () => {
        this.notification.success('Gasto registrado correctamente.', '¡Éxito!');
        this.router.navigate(['/gastos']);
      },
      error: (err) => {
        console.error('Error creando gasto:', err);
        this.isSubmitting = false;
      }
    });
  }
}
