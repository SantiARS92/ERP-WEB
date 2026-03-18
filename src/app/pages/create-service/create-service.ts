import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { Service } from '../../core/models/service.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-create-service',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-service.html',
  styles: ``,
})
export class CreateService {
  service: Service = {
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    active: true,
    categoryId: 0
  };

  categories: Category[] = [];

  private serviceApi = inject(ServiceApiService);
  private categoryApi = inject(CategoryApiService);
  private router = inject(Router);

  ngOnInit() {
    this.categoryApi.getCategories().subscribe(cats => {
      this.categories = cats;
      // Ensure we select the first category if none is selected
      if (this.categories.length > 0 && (this.service.categoryId === 0 || !this.service.categoryId)) {
        this.service.categoryId = this.categories[0].id!;
      }
    });
  }

  toggleStatus() {
    this.service.active = !this.service.active;
  }

  saveService() {
    // Ensure categoryId is treated as a number
    this.service.categoryId = Number(this.service.categoryId);

    if (!this.service.name || this.service.durationMinutes <= 0 || this.service.price <= 0 || !this.service.categoryId) {
      alert('Por favor, rellene todos los campos obligatorios: Nombre, Categoría, Duración (>0) y Precio (>0).');
      return;
    }

    console.log('Enviando payload a la API:', this.service);

    this.serviceApi.createService(this.service).subscribe({
      next: (response) => {
        console.log('Servicio creado con éxito:', response);
        this.router.navigate(['/servicios']);
      },
      error: (err) => {
        console.error('Error completo de la API:', err);
        let errorMsg = 'Error al crear el servicio.\n\n';
        
        if (err.status === 400) {
          errorMsg += 'El servidor rechazó los datos (400 Bad Request).\n';
          if (err.error) {
            errorMsg += 'Detalle: ' + JSON.stringify(err.error, null, 2);
          }
        } else if (err.status === 0) {
          errorMsg += 'No se pudo conectar con el servidor. Verifique que la API en localhost:8080 esté encendida.';
        } else {
          errorMsg += `Código: ${err.status}\nMensaje: ${err.message}`;
        }
        
        alert(errorMsg);
      }
    });
  }
}
