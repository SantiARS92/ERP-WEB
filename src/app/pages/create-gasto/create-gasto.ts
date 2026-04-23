import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { ExpenseRequest, ExpenseCategory } from '../../core/models/expense.model';
import { Product, InventoryVariant } from '../../core/models/product.model';

@Component({
  selector: 'app-create-gasto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-gasto.html',
  styles: ``,
})
export class CreateGasto implements OnInit {
  private expenseApi = inject(ExpenseApiService);
  private productApi = inject(ProductApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  products: Product[] = [];
  selectedProduct: Product | null = null;
  selectedVariant: InventoryVariant | null = null;
  
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

  isSubmitting = false;

  ngOnInit(): void {
    this.productApi.getProducts({ size: 500 }).subscribe({
      next: (res) => {
        this.products = res.content || [];
        this.cdr.detectChanges();
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
            this.cdr.detectChanges();
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
    this.totalGasto = qty * amount;

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
        alert('Para suministros, debe seleccionar un producto del inventario.');
        return;
      }
      if (this.selectedProduct?.hasVariants && !this.newExpense.inventoryProductVariantId) {
        alert('Debe seleccionar una variante del producto.');
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
      alert('El importe debe ser mayor a 0.');
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
    this.cdr.detectChanges();

    this.expenseApi.createExpense(payload).subscribe({
      next: () => {
        this.router.navigate(['/gastos']);
      },
      error: (err) => {
        console.error('Error creando gasto:', err);
        this.isSubmitting = false;
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) || 'Error al registrar el gasto.';
        alert(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }
}
