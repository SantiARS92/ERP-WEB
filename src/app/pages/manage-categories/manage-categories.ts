import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Category } from '../../core/models/category.model';
import { CategoryApiService } from '../../core/services/category-api.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { ServicesStore } from '../../core/state/services.store';

@Component({
  selector: 'app-manage-categories',
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './manage-categories.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCategories {
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);
  readonly isDeleteModalOpen = signal(false);
  readonly searchText = signal('');
  readonly selectedCategoryName = signal('');
  readonly currentPage = signal(0);
  readonly pageSize = 10;

  private readonly refreshTick = signal(0);
  categoryToDelete?: Category;
  
  // Category Form State
  categoryForm: Category = {
    name: '',
    icon: 'spa',
    color: '#DCEBFF'
  };
  editingId?: number;

  public authService = inject(AuthService);
  readonly isAdmin = computed(() => this.authService.hasRole([UserRole.ADMIN]));
  private categoryApi = inject(CategoryApiService);
  private categoriesStore = inject(CategoriesStore);
  private servicesStore = inject(ServicesStore);
  private notification = inject(NotificationService);
  private readonly categoriesResponse = toSignal(
    toObservable(computed(() => ({ search: this.searchText(), refreshTick: this.refreshTick() }))).pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.search === curr.search && prev.refreshTick === curr.refreshTick),
      switchMap(({ search }) => this.categoryApi.getCategories(search).pipe(
        map((categories) => ({ categories, error: false })),
        catchError(() => of({ categories: [], error: true })),
      )),
      startWith({ categories: [], error: false }),
    ),
    { initialValue: { categories: [], error: false } }
  );
  readonly allCategories = computed(() => this.categoriesResponse().categories);
  readonly categoriesError = computed(() => this.categoriesResponse().error);
  readonly totalElements = computed(() => this.allCategories().length);
  readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize) || 1);
  readonly categories = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.allCategories().slice(start, start + this.pageSize);
  });

  goToPage(p: number) {
    this.currentPage.set(p);
  }

  onSearch(searchText: string) {
    this.searchText.set(searchText);
    this.currentPage.set(0);
  }

  // Opens the Add/Edit Category Modal
  openModal(category?: Category) {
    if (category) {
      this.isEditMode.set(true);
      this.editingId = category.id;
      this.categoryForm = { ...category };
    } else {
      this.isEditMode.set(false);
      this.editingId = undefined;
      this.categoryForm = { name: '', icon: 'spa', color: '#DCEBFF' };
    }
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveCategory() {
    if (!this.categoryForm.name) return;

    const request = this.isEditMode() && this.editingId
      ? this.categoryApi.updateCategory(this.editingId, this.categoryForm)
      : this.categoryApi.createCategory(this.categoryForm);

    request.subscribe({
      next: () => {
        this.categoriesStore.refresh().subscribe();
        this.servicesStore.refresh().subscribe();
        this.refreshTick.update((value) => value + 1);
        this.closeModal();
      },
      error: (err) => {
        if (err.status === 409) {
          this.notification.error('Ya existe una categoría con ese nombre.');
        } else {
          this.notification.error(`Error al guardar categoría: ${err.message}`);
        }
      }
    });
  }

  deleteCategory(cat: Category) {
    if (!cat.id) return;
    this.categoryToDelete = cat;
    this.selectedCategoryName.set(cat.name);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.categoryToDelete = undefined;
    this.selectedCategoryName.set('');
  }

  confirmDelete() {
    if (!this.categoryToDelete?.id) return;

    this.categoryApi.deleteCategory(this.categoryToDelete.id).subscribe({
      next: () => {
        this.categoriesStore.refresh().subscribe();
        this.servicesStore.refresh().subscribe();
        this.refreshTick.update((value) => value + 1);
        this.closeDeleteModal();
      },
      error: (err) => {
        if (err.status === 409) {
          this.notification.error('No se puede eliminar: esta categoría tiene servicios asociados.');
        } else {
          this.notification.error(`Error al eliminar: ${err.message}`);
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
