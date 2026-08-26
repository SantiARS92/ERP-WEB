import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Service } from '../../core/models/service.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-edit-service',
  imports: [FormsModule, RouterModule],
  templateUrl: './edit-service.html',
  styles: ``,
})
export class EditService implements OnInit {
  service: Service = {
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    active: true,
    categoryId: 0
  };
  serviceId!: number;
  categories: Category[] = [];

  private serviceApi = inject(ServiceApiService);
  private categoryApi = inject(CategoryApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.categoryApi.getCategories().subscribe(cats => {
      this.categories = cats;
    });
    this.serviceId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.serviceId) {
      this.serviceApi.getServiceById(this.serviceId).subscribe({
        next: (data) => {
          this.service = data;
          if (data.category && data.category.id) {
            this.service.categoryId = data.category.id;
          }
        },
        error: (err) => {
          if (err.status === 404) {
             alert('Servicio no encontrado');
             this.router.navigate(['/servicios']);
          } else {
             console.error('Error fetching service', err);
          }
        }
      });
    }
  }

  toggleStatus() {
    this.service.active = !this.service.active;
  }

  saveChanges() {
    if (!this.service.name || this.service.durationMinutes <= 0 || this.service.price <= 0 || !this.service.categoryId) {
      alert('Por favor, rellene todos los campos obligatorios: Nombre, Categoría, Duración (>0) y Precio (>0).');
      return;
    }

    this.serviceApi.updateService(this.serviceId, this.service).subscribe({
      next: () => this.router.navigate(['/servicios']),
      error: (err) => {
        if (err.status === 400) {
          alert('Datos inválidos o faltantes. Revise Nombre, Categoría, Duración o Precio.');
        } else if (err.status === 404) {
          alert('No se pudo encontrar el servicio para actualizar.');
        } else {
          console.error('Error updating service', err);
        }
      }
    });
  }

  deleteService() {
    if (confirm('¿Está seguro de eliminar este servicio?')) {
       this.serviceApi.deleteService(this.serviceId).subscribe({
         next: () => this.router.navigate(['/servicios']),
         error: (err) => console.error('Error deleting service', err)
       });
    }
  }
}
