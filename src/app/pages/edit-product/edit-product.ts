import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { VariantConfigComponent } from '../inventory/components/variant-config/variant-config';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { ProductsStore } from '../../core/state/products.store';

@Component({
  selector: 'app-edit-product',
  imports: [RouterLink, FormsModule, VariantConfigComponent],
  templateUrl: './edit-product.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProduct implements OnInit {
  public authService = inject(AuthService);
  readonly isAdmin = computed(() => this.authService.hasRole([UserRole.ADMIN]));
  private productApi = inject(ProductApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private categoriesStore = inject(CategoriesStore);
  private productsStore = inject(ProductsStore);

  isEditMode = false;
  private readonly isSubmittingSignal = signal(false);
  
  private readonly selectedVariantToEditSignal = signal<InventoryVariant | null>(null);
  private readonly editingVariantDraftSignal = signal<InventoryVariant | null>(null);

  private readonly productSignal = signal<Product>({
    name: '',
    categoryId: 0,
    sku: '',
    stock: 0,
    minimumStock: 10,
    status: 'IN_STOCK',
    purchasePrice: 0,
    description: '',
    hasVariants: false,
    variants: []
  });

  private readonly categoriesSignal = signal<Category[]>([]);

  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }

  get selectedVariantToEdit() { return this.selectedVariantToEditSignal(); }
  set selectedVariantToEdit(value: InventoryVariant | null) { this.selectedVariantToEditSignal.set(value); }

  get editingVariantDraft() { return this.editingVariantDraftSignal(); }
  set editingVariantDraft(value: InventoryVariant | null) { this.editingVariantDraftSignal.set(value); }

  get product() { return this.productSignal(); }
  set product(value: Product) { this.productSignal.set(value); }

  get categories() { return this.categoriesSignal(); }
  set categories(value: Category[]) { this.categoriesSignal.set(value); }

  get statusLabel(): { label: string; cls: string } {
    if (this.product.hasVariants) return { label: 'Gestionado por Variantes', cls: 'text-blue-600' };
    if (this.product.stock <= 0) return { label: 'Agotado', cls: 'text-red-500' };
    if (this.product.stock <= this.product.minimumStock) return { label: 'Bajo Stock', cls: 'text-orange-500' };
    return { label: 'En Stock', cls: 'text-emerald-600' };
  }

  get totalVariantStock(): number {
    return (this.product.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0);
  }

  ngOnInit(): void {
    this.loadCategories();
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr && idStr !== 'nuevo') {
        const id = Number(idStr);
        if (!isNaN(id)) {
          this.isEditMode = true;
          this.loadProduct(id);
        }
      }
    });
  }

  loadCategories() {
    this.categoriesStore.ensureLoaded().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: () => this.notification.error('Error al cargar las categorías.')
    });
  }

  loadProduct(id: number) {
    this.productApi.getProductById(id).subscribe({
      next: (data) => {
        this.product = { 
          ...data,
          variants: data.variants ? data.variants.map(v => ({ ...v })) : []
        };
      },
      error: (err) => {
        console.error('Error loading product:', err);
        this.router.navigate(['/inventario']);
      }
    });
  }

  onToggleVariants() {
    if (this.product.hasVariants && this.isEditMode && this.product.id && !this.product.hasVariants && this.product.stock > 0) {
      this.notification.warning('No se puede convertir un producto simple con stock a un producto con variantes.');
      this.product.hasVariants = false;
      return;
    }
  }

  openVariantEditor(v: InventoryVariant) {
    this.selectedVariantToEdit = v;
    this.editingVariantDraft = { ...v };
  }

  saveVariantEditor() {
    if (this.selectedVariantToEdit && this.editingVariantDraft) {
      Object.assign(this.selectedVariantToEdit, this.editingVariantDraft);
    }
    this.selectedVariantToEdit = null;
    this.editingVariantDraft = null;
  }

  closeVariantEditor() {
    this.selectedVariantToEdit = null;
    this.editingVariantDraft = null;
  }

  saveProduct() {
    if (!this.product.name.trim()) {
      this.notification.warning('Debe introducir un nombre para el producto.');
      return;
    }
    if (!this.product.categoryId) {
      this.notification.warning('Debe seleccionar una categoría.');
      return;
    }

    if (this.product.hasVariants && (!this.product.variants || this.product.variants.length === 0)) {
      this.notification.warning('Debe configurar al menos una variante si el producto tiene variantes.');
      return;
    }

    this.isSubmitting = true;

    // Prepare payload (match modal logic)
    const payload: Product = {
      ...this.product,
      name: this.product.name.trim(),
      description: this.product.description?.trim() || undefined,
      sku: this.product.hasVariants ? undefined : (this.product.sku?.trim() || undefined),
      stock: this.product.hasVariants ? this.product.variants?.reduce((acc, v) => acc + v.stock, 0) || 0 : this.product.stock,
      minimumStock: this.product.hasVariants ? 0 : this.product.minimumStock,
      purchasePrice: this.product.hasVariants ? undefined : this.product.purchasePrice,
      productType: this.product.hasVariants ? 'VARIANT' : 'SIMPLE',
      variants: this.product.hasVariants ? this.product.variants?.map(v => ({
        ...v,
        active: v.active ?? true
      })) : [],
    };

    const obs = this.isEditMode && this.product.id
      ? this.productApi.updateProduct(this.product.id, payload)
      : this.productApi.createProduct(payload);

    obs.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.productsStore.refresh().subscribe();
        this.notification.success(this.isEditMode ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.', '¡Éxito!');
        this.router.navigate(['/inventario']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error saving product:', err);
      }
    });
  }

  async deleteProduct() {
    if (!this.product.id) {
      return;
    }

    const confirmed = await this.confirm.ask('¿Está seguro de que desea eliminar este producto permanentemente?', {
      title: 'Eliminar producto',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.productApi.deleteProduct(this.product.id).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Producto eliminado del inventario.', 'Eliminado');
        this.router.navigate(['/inventario']);
      },
      error: () => {
        this.notification.error('Error al eliminar el producto.');
      }
    });
  }

  cancel() {
    this.router.navigate(['/inventario']);
  }

  getVariantStatus(v: InventoryVariant): { label: string; cls: string } {
    if (v.stock <= 0) return { label: 'Agotado', cls: 'text-red-500' };
    if (v.stock <= v.minimumStock) return { label: 'Bajo Stock', cls: 'text-orange-500' };
    return { label: 'En Stock', cls: 'text-emerald-500' };
  }
}
