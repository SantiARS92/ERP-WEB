import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExpenseRequest, ExpenseResponse, ExpenseCategory } from '../../core/models/expense.model';
import { Product, InventoryVariant } from '../../core/models/product.model';

@Component({
  selector: 'app-edit-gasto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-gasto.html',
  styles: ``,
})
export class EditGasto implements OnInit {
  expense: ExpenseRequest = {
    concept: '',
    category: 'SUPPLIES',
    amount: 0,
    quantity: 1,
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  totalGasto = 0;
  stockFinal = 0;
  
  products: Product[] = [];
  selectedProduct: Product | null = null;
  selectedVariant: InventoryVariant | null = null;
  
  conceptSuggestions: string[] = [];
  conceptSelectedFromSuggestions = true; // assume true initially for existing expenses

  originalExpense: ExpenseResponse | undefined;
  expenseId!: number;
  isSubmitting = false;
  isLoading = true;

  private expenseApi = inject(ExpenseApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private notification = inject(NotificationService);

  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'SUPPLIES', label: 'Suministros' },
    { value: 'SERVICES', label: 'Servicios'   },
    { value: 'OTHER',    label: 'Otros'        },
  ];

  ngOnInit() {
    this.loadProducts();
    
    // Fallback: If after 8 seconds we are still loading, redirect data to prevent "infinite" feeling
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('EditGasto: Timeout de carga excedido (8s). Redirigiendo...');
        this.isLoading = false;
        this.router.navigate(['/gastos']);
        this.cdr.detectChanges();
      }
    }, 8000);

    // Get ID from paramMap instead of snapshot to be safer
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      this.expenseId = Number(idStr);
      
      console.log('EditGasto: Cargando ID', this.expenseId);

      if (idStr && !isNaN(this.expenseId)) {
        this.expenseApi.getExpenseById(this.expenseId).subscribe({
          next: (data) => {
            console.log('EditGasto: Datos recibidos', data);
            if (!data) {
              console.error('EditGasto: No hay datos para el ID', this.expenseId);
              this.router.navigate(['/gastos']);
              return;
            }
            this.originalExpense = data;
            let unitOrTotalAmount = data.amount || 0;
            if (data.category === 'SUPPLIES' && (data.inventoryProductId || data.inventoryProductVariantId)) {
              unitOrTotalAmount = (data.amount || 0) / (data.quantity || 1);
            }

            this.expense = {
              concept:     data.concept || '',
              category:    data.category || 'SUPPLIES',
              amount:      unitOrTotalAmount,
              quantity:    data.quantity || 1,
              expenseDate: data.expenseDate || new Date().toISOString().split('T')[0],
              notes:       data.notes ?? '',
              inventoryProductId: data.inventoryProductId,
              inventoryProductVariantId: data.inventoryProductVariantId
            };
            this.isLoading = false;
            this.calculateSummary();
            
            if (this.expense.inventoryProductId) {
              this.onProductChange(true);
            }

            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('EditGasto: Error cargando el gasto', err);
            this.isLoading = false; // Stop loading even on error before redirect
            this.cdr.detectChanges();
            
            if (err.status === 404) this.notification.error('Gasto no encontrado.', 'No existe');
            this.router.navigate(['/gastos']);
          }
        });
      } else {
        console.error('EditGasto: ID no válido o ausente', idStr);
        this.router.navigate(['/gastos']);
      }
    });
  }

  onConceptInput() {
    this.conceptSelectedFromSuggestions = false;
    const query = this.expense.concept;
    const category = this.expense.category;
    if (query && query.length >= 2 && category !== 'SUPPLIES') {
      this.expenseApi.getSuggestions(query, category).subscribe({
        next: (data) => {
          this.conceptSuggestions = data;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching suggestions:', err)
      });
    } else {
      this.conceptSuggestions = [];
    }
  }

  selectSuggestion(val: string) {
    this.expense.concept = val;
    this.conceptSelectedFromSuggestions = true;
    this.conceptSuggestions = [];
    this.cdr.detectChanges();
  }

  loadProducts() {
    this.productApi.getProducts({ size: 500 }).subscribe({
      next: (res) => {
        this.products = res.content || [];
        this.cdr.detectChanges();
      }
    });
  }

  onCategoryChange() {
    if (this.expense.category !== 'SUPPLIES') {
      this.selectedProduct = null;
      this.selectedVariant = null;
      this.expense.inventoryProductId = undefined;
      this.expense.inventoryProductVariantId = undefined;
    }
    this.calculateSummary();
  }

  onProductChange(isInitialLoad = false) {
    const productId = Number(this.expense.inventoryProductId);
    if (!productId) {
      this.selectedProduct = null;
      this.selectedVariant = null;
      this.expense.inventoryProductVariantId = undefined;
      return;
    }

    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.selectedProduct = product;
      
      // Only reset variant if not initial load
      if (!isInitialLoad) {
        this.selectedVariant = null;
        this.expense.inventoryProductVariantId = undefined;
        
        // Auto-set concept if empty
        if (!this.expense.concept) {
          this.expense.concept = product.name;
        }
      }

      if (product.hasVariants && (!product.variants || product.variants.length === 0)) {
        this.productApi.getProductById(productId).subscribe({
          next: (fullProduct) => {
            product.variants = fullProduct.variants;
            if (isInitialLoad && this.expense.inventoryProductVariantId) {
              this.onVariantChange();
            }
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Error loading product details:', err)
        });
      } else if (isInitialLoad && this.expense.inventoryProductVariantId) {
        this.onVariantChange();
      }
    }
    this.calculateSummary();
  }

  onVariantChange() {
    const variantId = Number(this.expense.inventoryProductVariantId);
    if (this.selectedProduct && variantId) {
      this.selectedVariant = this.selectedProduct.variants?.find(v => v.id === variantId) || null;
    } else {
      this.selectedVariant = null;
    }
    this.calculateSummary();
  }

  calculateSummary() {
    const qty = Number(this.expense.quantity || 1);
    const amount = Number(this.expense.amount || 0);

    if (this.expense.category === 'SUPPLIES' && this.expense.inventoryProductId) {
      this.totalGasto = qty * amount;
    } else {
      this.totalGasto = amount;
    }

    if (this.expense.category === 'SUPPLIES' && (this.selectedProduct || this.selectedVariant)) {
      const currentStock = this.selectedVariant ? this.selectedVariant.stock : (this.selectedProduct?.stock || 0);
      this.stockFinal = currentStock + qty;
    } else {
      this.stockFinal = 0;
    }
  }

  saveExpense() {
    if (this.expense.category === 'SUPPLIES') {
       if (this.selectedProduct) {
          let concept = this.selectedProduct.name;
          if (this.selectedVariant) {
            concept += ` - ${this.selectedVariant.variantLabel}`;
          }
          this.expense.concept = concept;
       }
    } else {
      if (!this.expense.concept?.trim()) { this.notification.warning('Debe introducir un concepto.'); return; }
    }
    if (!this.expense.amount || this.expense.amount <= 0) { this.notification.warning('El importe debe ser mayor a 0.'); return; }
    if (!this.expense.quantity || this.expense.quantity <= 0) { this.notification.warning('La cantidad debe ser mayor a 0.'); return; }

    const payload: any = {
      ...this.expense,
      amount: Number(this.expense.amount),
      quantity: Number(this.expense.quantity)
    };

    if (this.expense.category === 'SUPPLIES') {
      payload.inventoryProductId = Number(this.expense.inventoryProductId);
      if (this.selectedProduct?.hasVariants) {
        payload.inventoryProductVariantId = Number(this.expense.inventoryProductVariantId);
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
    this.expenseApi.updateExpense(this.expenseId, payload).subscribe({
      next: () => {
        this.notification.success('Gasto guardado correctamente.', '¡Actualizado!');
        this.router.navigate(['/gastos']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error updating expense:', err);
        this.cdr.detectChanges();
      }
    });
  }

  deleteExpense() {
    if (confirm('¿Está seguro de eliminar permanentemente este gasto?')) {
      this.expenseApi.deleteExpense(this.expenseId).subscribe({
        next: () => {
          this.notification.success('Gasto eliminado.', 'Eliminado');
          this.router.navigate(['/gastos']);
        },
        error: () => this.notification.error('Ocurrió un error al eliminar el gasto.')
      });
    }
  }
}
