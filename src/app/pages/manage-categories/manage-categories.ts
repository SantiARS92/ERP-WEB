import { CommonModule } from '@angular/common';
import { Category } from '../../core/models/category.model';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  private categoryApi = inject(CategoryApiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryApi.getCategories(this.searchText).subscribe(cats => {
      this.categories = cats;
      this.cdr.detectChanges();
    });
  }

  onSearch() {
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
