import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { SaleRequest } from '../../core/models/sale.model';
import { Service } from '../../core/models/service.model';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { Client } from '../../core/models/client.model';

@Component({
  selector: 'app-create-sale',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-sale.html',
  styles: ``,
})
export class CreateSale implements OnInit {
  private saleApi = inject(SaleApiService);
  private serviceApi = inject(ServiceApiService);
  private productApi = inject(ProductApiService);
  private clientApi = inject(ClientApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private notification = inject(NotificationService);

  services: Service[] = [];
  products: Product[] = [];
  clients: Client[] = [];

  selectedClient: Client | null = null;
  selectedProduct: Product | null = null;
  selectedService: Service | null = null;
  selectedVariant: InventoryVariant | null = null;

  totalEstimado = 0;
  stockRestante = 0;

  newSale: SaleRequest = {
    clientId: undefined,
    itemType: 'SERVICE',
    quantity: 1,
    paymentMethod: 'CASH',
    saleDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  constructor() {
    // Add watcher for quantities and prices if they change manually
  }

  isSubmitting = false;

  ngOnInit(): void {
    this.clientApi.getClients({ size: 500 }).subscribe({ next: (res) => { this.clients = res.content || []; this.cdr.detectChanges(); } });
    this.serviceApi.getServices({ active: true, size: 200 }).subscribe({ next: (res) => { this.services = res.content || []; this.cdr.detectChanges(); } });
    this.productApi.getProducts({ size: 500 }).subscribe({ next: (res) => { this.products = res.content || []; this.cdr.detectChanges(); } });
  }

  onProductChange() {
    const productId = Number(this.newSale.inventoryProductId);
    if (!productId) {
      this.selectedProduct = null;
      this.selectedVariant = null;
      this.newSale.inventoryProductVariantId = null;
      return;
    }

    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.selectedProduct = product;
      this.selectedVariant = null;
      this.newSale.inventoryProductVariantId = null;

      // If it has variants but they aren't loaded (backend might return variants: [] in list)
      if (product.hasVariants && (!product.variants || product.variants.length === 0)) {
        this.productApi.getProductById(productId).subscribe({
          next: (fullProduct) => {
            product.variants = fullProduct.variants;
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Error loading product details:', err)
        });
      }
    }
    this.calculateSummary();
  }

  onVariantChange() {
    const variantId = Number(this.newSale.inventoryProductVariantId);
    if (this.selectedProduct && variantId) {
      this.selectedVariant = this.selectedProduct.variants?.find(v => v.id === variantId) || null;
      if (this.selectedVariant && this.selectedVariant.purchasePrice) {
          this.newSale.unitPrice = this.selectedVariant.purchasePrice;
      } else if (this.selectedProduct.purchasePrice) {
          this.newSale.unitPrice = this.selectedProduct.purchasePrice;
      }
    } else {
      this.selectedVariant = null;
    }
    this.calculateSummary();
  }

  onClientChange() {
    this.selectedClient = this.clients.find(c => c.id === Number(this.newSale.clientId)) || null;
  }

  onServiceChange() {
    this.selectedService = this.services.find(s => s.id === Number(this.newSale.serviceId)) || null;
    if (this.selectedService) {
        this.newSale.unitPrice = this.selectedService.price;
    }
    this.calculateSummary();
  }

  calculateSummary() {
    const qty = this.newSale.quantity || 0;
    let price = this.newSale.unitPrice || 0;

    if (!this.newSale.unitPrice && this.newSale.itemType === 'SERVICE' && this.selectedService) {
        price = this.selectedService.price;
    }

    this.totalEstimado = qty * price;

    if (this.newSale.itemType === 'PRODUCT' && this.selectedProduct) {
        const currentStock = this.selectedVariant ? this.selectedVariant.stock : this.selectedProduct.stock;
        this.stockRestante = Math.max(0, currentStock - qty);
    } else {
        this.stockRestante = 0;
    }
  }

  registerSale() {
    if (!this.newSale.clientId) {
      this.notification.warning('Debe seleccionar un cliente.');
      return;
    }
    if (this.newSale.itemType === 'SERVICE' && !this.newSale.serviceId) {
      this.notification.warning('Debe seleccionar un servicio.');
      return;
    }
    if (this.newSale.itemType === 'PRODUCT') {
      if (!this.newSale.inventoryProductId) {
        this.notification.warning('Debe seleccionar un producto del inventario.');
        return;
      }
      if (this.selectedProduct?.hasVariants && !this.newSale.inventoryProductVariantId) {
        this.notification.warning('Debe seleccionar una variante del producto.');
        return;
      }
    }
    if (this.newSale.quantity <= 0) {
      this.notification.warning('La cantidad debe ser mayor a 0.');
      return;
    }

    const payload: any = { ...this.newSale };
    
    // Convert numbers explicitly
    payload.clientId = Number(payload.clientId);
    payload.quantity = Number(payload.quantity);
    if (payload.unitPrice) payload.unitPrice = Number(payload.unitPrice);

    if (payload.itemType === 'SERVICE') {
        payload.serviceId = Number(payload.serviceId);
        delete payload.inventoryProductId;
        delete payload.inventoryProductVariantId;
    } else {
        payload.inventoryProductId = Number(payload.inventoryProductId);
        if (this.selectedProduct?.hasVariants) {
          payload.inventoryProductVariantId = Number(payload.inventoryProductVariantId);
        } else {
          // Explicitly null or omit for simple products
          payload.inventoryProductVariantId = null;
        }
        delete payload.serviceId;
    }

    payload.saleTime = '00:00:00';
    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.saleApi.createSale(payload).subscribe({
      next: (res) => {
        this.notification.success('Venta registrada correctamente.', '¡Éxito!');
        this.router.navigate(['/ventas']);
      },
      error: (err) => {
        console.error('Error creando venta:', err);
        this.isSubmitting = false;
        // La notificación global interceptará este mensaje, no necesitamos alert
        this.cdr.detectChanges();
      }
    });
  }
}
