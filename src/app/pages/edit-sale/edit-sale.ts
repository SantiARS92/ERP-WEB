import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { SaleRequest, SaleResponse } from '../../core/models/sale.model';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';
import { Product } from '../../core/models/product.model';
import { ProductApiService } from '../../core/services/product-api.service';

@Component({
  selector: 'app-edit-sale',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-sale.html',
  styles: ``,
})
export class EditSale implements OnInit {
  sale: SaleRequest = {
    clientId: undefined,
    itemType: 'SERVICE',
    quantity: 1,
    paymentMethod: 'CASH'
  };
  
  originalSale: SaleResponse | undefined;
  saleId!: number;
  clients: Client[] = [];
  services: Service[] = [];
  products: Product[] = [];
  isSubmitting = false;

  private saleApi = inject(SaleApiService);
  private clientApi = inject(ClientApiService);
  private serviceApi = inject(ServiceApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.clientApi.getClients({ size: 500 }).subscribe({ next: (res) => this.clients = res.content || [] });
    this.serviceApi.getServices({ size: 500 }).subscribe({ next: (res) => this.services = res.content || [] });
    this.productApi.getProducts({ size: 500 }).subscribe({ next: (res) => this.products = res.content || [] });
    
    this.saleId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.saleId) {
      this.saleApi.getSaleById(this.saleId).subscribe({
        next: (data) => {
          this.originalSale = data;
          this.sale = {
            clientId: data.clientId,
            itemType: data.itemType,
            inventoryProductId: data.inventoryProductId,
            serviceId: data.serviceId,
            itemName: data.itemName,
            unitPrice: data.unitPrice,
            quantity: data.quantity,
            paymentMethod: data.paymentMethod,
            saleDate: data.saleDate,
            saleTime: data.saleTime ? data.saleTime.substring(0, 5) : undefined,
            notes: data.notes
          };
        },
        error: (err) => {
          if (err.status === 404) alert('Venta no encontrada');
          this.router.navigate(['/ventas']);
        }
      });
    }
  }

  saveSale() {
    if (this.originalSale?.sourceType === 'APPOINTMENT') {
       alert('No se pueden modificar las ventas generadas automáticamente desde citas.');
       return;
    }
    
    if (!this.sale.clientId) { alert('Debe seleccionar un cliente.'); return; }
    if (this.sale.itemType === 'SERVICE' && !this.sale.serviceId) { alert('Debe seleccionar un servicio.'); return; }
    if (this.sale.itemType === 'PRODUCT' && !this.sale.inventoryProductId) { alert('Debe seleccionar un producto del inventario.'); return; }
    if (this.sale.quantity <= 0) { alert('La cantidad debe ser mayor a 0.'); return; }

    this.sale.clientId = Number(this.sale.clientId);
    if (this.sale.serviceId) this.sale.serviceId = Number(this.sale.serviceId);
    if (this.sale.inventoryProductId) this.sale.inventoryProductId = Number(this.sale.inventoryProductId);
    if (this.sale.unitPrice) this.sale.unitPrice = Number(this.sale.unitPrice);
    this.sale.quantity = Number(this.sale.quantity);

    if (this.sale.saleTime && this.sale.saleTime.length === 5) {
      this.sale.saleTime = this.sale.saleTime + ':00';
    }

    const payload = { ...this.sale };
    if (payload.itemType === 'SERVICE') {
        delete payload.inventoryProductId;
    } else {
        delete payload.serviceId;
    }

    this.isSubmitting = true;
    this.saleApi.updateSale(this.saleId, payload).subscribe({
      next: () => this.router.navigate(['/ventas']),
      error: (err) => {
        this.isSubmitting = false;
        alert('Hubo un error al guardar los cambios.');
        console.error(err);
      }
    });
  }

  deleteSale() {
    if (this.originalSale?.sourceType === 'APPOINTMENT') {
       alert('No se pueden eliminar las ventas vinculadas a una cita. Cancele la cita para anular la venta.');
       return;
    }
    if (confirm('¿Está seguro de eliminar permanentemente esta venta manual?')) {
       this.saleApi.deleteSale(this.saleId).subscribe({
         next: () => this.router.navigate(['/ventas']),
         error: (err) => alert('Ocurrió un error al eliminar la venta.')
       });
    }
  }
}
