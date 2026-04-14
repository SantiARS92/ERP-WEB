import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ProductApiService } from '../../core/services/product-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './edit-product.html',
  styles: ``,
})
export class EditProduct implements OnInit {
  public authService = inject(AuthService);
  public UserRole = UserRole;
  private productApi = inject(ProductApiService);
  private categoryApi = inject(CategoryApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isEditMode = false;
  isSubmitting = false;

  product: Product = {
    name: '',
    categoryId: 0,
    sku: '',
    stock: 0,
    minimumStock: 0,
    status: 'IN_STOCK',
    purchasePrice: 0,
    description: ''
  };

  categories: Category[] = [];

  statusOptions = [
    { value: 'IN_STOCK', label: 'En Stock', color: 'bg-emerald-500' },
    { value: 'LOW_STOCK', label: 'Stock Bajo', color: 'bg-orange-500' },
    { value: 'OUT_OF_STOCK', label: 'Agotado', color: 'bg-red-500' }
  ];

  ngOnInit(): void {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEditMode = true;
      this.loadProduct(Number(id));
    }
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
        this.product = { ...data };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading product:', err)
    });
  }

  saveProduct() {
     if (!this.product.name.trim()) {
      alert('Debe introducir un nombre para el producto.');
      return;
    }
    if (!this.product.categoryId) {
      alert('Debe seleccionar una categoría.');
      return;
    }

    this.isSubmitting = true;
    const obs = this.isEditMode 
      ? this.productApi.updateProduct(this.product.id!, this.product)
      : this.productApi.createProduct(this.product);

    obs.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/inventario']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error saving product:', err);
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) || 'Ocurrió un error al guardar el producto.';
        alert(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduct() {
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
      this.productApi.deleteProduct(this.product.id!).subscribe({
        next: () => this.router.navigate(['/inventario']),
        error: (err) => console.error('Error deleting product:', err)
      });
    }
  }

  cancel() {
    this.router.navigate(['/inventario']);
  }
}
