import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Category } from '../../core/models/category.model';
import { CategoryApiService } from '../../core/services/category-api.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-manage-categories',
  imports: [FormsModule, PaginationComponent],
  templateUrl: './manage-categories.html',
  styles: ``,
})
export class ManageCategories implements OnInit {
  isModalOpen = false;
  isEditMode = false;
  isDeleteModalOpen = false;
  searchText = '';
  selectedCategoryName = '';
  categoryToDelete?: Category;
  
  // Category Form State
  categoryForm: Category = {
    name: '',
    icon: 'spa',
    color: '#DCEBFF'
  };
  editingId?: number;

  categories: Category[] = [];
  
  // Pagination State
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  public authService = inject(AuthService);
  public UserRole = UserRole;
  private categoryApi = inject(CategoryApiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryApi.getCategories(this.searchText).subscribe(cats => {
      this.totalElements = cats.length;
      this.totalPages = Math.ceil(this.totalElements / this.pageSize) || 1;
      
      // Client-side pagination since API returns full list
      const start = this.currentPage * this.pageSize;
      const end = start + this.pageSize;
      this.categories = cats.slice(start, end);
      
      this.cdr.detectChanges();
    });
  }

  goToPage(p: number) {
    this.currentPage = p;
    this.loadCategories();
  }

  onSearch() {
    this.currentPage = 0;
    this.loadCategories();
  }

  get filteredCategories(): Category[] {
    if (!this.searchText.trim()) return this.categories;
    return this.categories.filter(cat =>
      cat.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  // Opens the Add/Edit Category Modal
  openModal(category?: Category) {
    if (category) {
      this.isEditMode = true;
      this.editingId = category.id;
      this.categoryForm = { ...category };
    } else {
      this.isEditMode = false;
      this.editingId = undefined;
      this.categoryForm = { name: '', icon: 'spa', color: '#DCEBFF' };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveCategory() {
    if (!this.categoryForm.name) return;

    const request = this.isEditMode && this.editingId
      ? this.categoryApi.updateCategory(this.editingId, this.categoryForm)
      : this.categoryApi.createCategory(this.categoryForm);

    request.subscribe({
      next: () => {
        this.loadCategories();
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 409) {
          alert('Error: Ya existe una categoría con ese nombre.');
        } else {
          alert('Error al guardar categoría: ' + err.message);
        }
      }
    });
  }

  deleteCategory(cat: Category) {
    if (!cat.id) return;
    this.categoryToDelete = cat;
    this.selectedCategoryName = cat.name;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.categoryToDelete = undefined;
    this.selectedCategoryName = '';
  }

  confirmDelete() {
    if (!this.categoryToDelete?.id) return;

    this.categoryApi.deleteCategory(this.categoryToDelete.id).subscribe({
      next: () => {
        this.loadCategories();
        this.closeDeleteModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 409) {
          alert('No se puede eliminar: esta categoría tiene servicios asociados.');
        } else {
          alert('Error al eliminar: ' + err.message);
        }
        this.closeDeleteModal();
      }
    });
  }

  selectColor(color: string) {
    this.categoryForm.color = color;
  }

  selectIcon(icon: string) {
    this.categoryForm.icon = icon;
  }
}
