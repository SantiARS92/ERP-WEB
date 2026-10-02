import { ChangeDetectionStrategy, Component, inject, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category } from '../../../core/models/category.model';
import { CategoryApiService } from '../../../core/services/category-api.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-category-modal',
  imports: [FormsModule],
  templateUrl: './category-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryModal implements OnInit {
  private categoryApi = inject(CategoryApiService);
  private notification = inject(NotificationService);

  /** Si se pasa, el modal funciona en modo edición */
  readonly category = input<Category | undefined>(undefined);
  readonly saved = output<Category>();
  readonly closed = output<void>();

  readonly colors = ['#DCEBFF', '#E9D9F7', '#FFE4E6', '#ECFDF5', '#FFF7ED', '#3B82F6'];
  readonly icons = [
    // Estética y belleza
    'spa', 'content_cut', 'brush', 'palette', 'clean_hands', 'face',
    'face_3', 'self_care', 'health_and_beauty', 'massage', 'hand_gesture', 'soap',
    // Agua y bienestar
    'water_drop', 'shower', 'bathtub', 'hot_tub', 'pool', 'self_improvement',
    // Salud y deporte
    'fitness_center', 'healing', 'medical_services', 'favorite', 'local_florist', 'eco',
    // Tienda y productos
    'diamond', 'checkroom', 'storefront', 'shopping_bag', 'inventory_2', 'redeem',
  ];

  categoryForm: Category = { name: '', icon: 'spa', color: '#DCEBFF' };

  get isEditMode() { return !!this.category()?.id; }

  ngOnInit() {
    const cat = this.category();
    if (cat) this.categoryForm = { ...cat };
  }

  selectColor(color: string) { this.categoryForm.color = color; }
  selectIcon(icon: string) { this.categoryForm.icon = icon; }

  save() {
    if (!this.categoryForm.name) return;

    const id = this.category()?.id;
    const request = id
      ? this.categoryApi.updateCategory(id, this.categoryForm)
      : this.categoryApi.createCategory(this.categoryForm);

    request.subscribe({
      next: (cat) => this.saved.emit(cat),
      error: (err) => {
        if (err.status === 409) {
          this.notification.error('Ya existe una categoría con ese nombre.');
        } else {
          this.notification.error(`Error al guardar categoría: ${err.message}`);
        }
      }
    });
  }
}
