import { ChangeDetectorRef, Component, OnInit, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { VariantConfigComponent } from '../inventory/components/variant-config/variant-config';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-edit-product',
  imports: [RouterLink, FormsModule, VariantConfigComponent],
  templateUrl: './edit-product.html',
  styles: ``,
})
export class EditProduct implements OnInit {
  public authService = inject(AuthService);
  readonly isAdmin = computed(() => this.authService.hasRole([UserRole.ADMIN]));
  private productApi = inject(ProductApiService);
  private categoryApi = inject(CategoryApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notification = inject(NotificationService);

  isEditMode = false;
  isSubmitting = false;
  
  selectedVariantToEdit: InventoryVariant | null = null;
  editingVariantDraft: InventoryVariant | null = null;

  product: Product = {
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
  };

  categories: Category[] = [];

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
    this.categoryApi.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading categories:', err)
    });
  }

  loadProduct(id: number) {
    this.productApi.getProductById(id).subscribe({
      next: (data) => {
        this.product = { 
          ...data,
          variants: data.variants ? data.variants.map(v => ({ ...v })) : []
        };
        this.cdr.detectChanges();
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
    this.cdr.detectChanges();
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
        this.notification.success(this.isEditMode ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.', '¡Éxito!');
        this.router.navigate(['/inventario']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error saving product:', err);
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduct() {
    if (this.product.id && confirm('¿Está seguro de que desea eliminar este producto permanentemente?')) {
      this.productApi.deleteProduct(this.product.id).subscribe({
        next: () => {
          this.notification.success('Producto eliminado del inventario.', 'Eliminado');
          this.router.navigate(['/inventario']);
        },
        error: (err) => {
          console.error('Error deleting product:', err);
          this.notification.error('Error al eliminar el producto.');
        }
      });
    }
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
