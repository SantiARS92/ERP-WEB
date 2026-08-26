import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { SaleRequest, PaymentMethod } from '../../core/models/sale.model';
import { Service } from '../../core/models/service.model';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { Client } from '../../core/models/client.model';

interface SaleLine {
  itemType: 'SERVICE' | 'PRODUCT';
  serviceId?: number;
  inventoryProductId?: number;
  inventoryProductVariantId?: number | null;
  unitPrice?: number;
  quantity: number;
  selectedService?: Service | null;
  selectedProduct?: Product | null;
  selectedVariant?: InventoryVariant | null;
}

@Component({
  selector: 'app-create-sale',
  imports: [DecimalPipe, FormsModule, RouterLink],
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

  totalEstimado = 0;

  sharedData = {
    clientId: undefined as number | undefined,
    paymentMethod: 'CASH' as PaymentMethod,
    saleDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    notes: '',
  };

  saleLines: SaleLine[] = [this.createEmptyLine()];
  
  createEmptyLine(): SaleLine {
    return { itemType: 'SERVICE', quantity: 1 };
  }
  
  addLine() {
    this.saleLines.push(this.createEmptyLine());
  }

  removeLine(index: number) {
    if (this.saleLines.length === 1) return; //siempre debe quedar al menos 1
    this.saleLines.splice(index, 1);
    this.calculateSummary();
  }

  constructor() {
    // Add watcher for quantities and prices if they change manually
  }

  isSubmitting = false;

  ngOnInit(): void {
    this.clientApi.getClients({ size: 500 }).subscribe({ next: (res) => { this.clients = res.content || []; this.cdr.detectChanges(); } });
    this.serviceApi.getServices({ active: true, size: 200 }).subscribe({ next: (res) => { this.services = res.content || []; this.cdr.detectChanges(); } });
    this.productApi.getProducts({ size: 500 }).subscribe({ next: (res) => { this.products = res.content || []; this.cdr.detectChanges(); } });
  }

  onProductChange(index: number) {
    const line = this.saleLines[index];
    const productId = Number(line.inventoryProductId);
    if (!productId) {
      line.selectedProduct = null;
      line.selectedVariant = null;
      line.inventoryProductVariantId = null;
      return;
    }
    
    const product = this.products.find(p => p.id === productId);
    if (product) {
      line.selectedProduct = product;
      line.selectedVariant = null;
      line.inventoryProductVariantId = null;

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

  onVariantChange(index: number) {
    const line = this.saleLines[index];
    const variantId = Number(line.inventoryProductVariantId);
    if (line.selectedProduct && variantId) {
      line.selectedVariant = line.selectedProduct.variants?.find(v => v.id === variantId) || null;
      if (line.selectedVariant?.purchasePrice) {
          line.unitPrice = line.selectedVariant.purchasePrice;
      } else if (line.selectedProduct.purchasePrice) {
          line.unitPrice = line.selectedProduct.purchasePrice;
      }
    } else {
      line.selectedVariant = null;
    }
    this.calculateSummary();
  }

  onServiceChange(index: number) {
    const line = this.saleLines[index];
    line.selectedService = this.services.find(s => s.id === Number(line.serviceId)) || null;
    if (line.selectedService) {
        line.unitPrice = line.selectedService.price;
    }
    this.calculateSummary();
  }

  calculateSummary() {
    this.totalEstimado = this.saleLines.reduce((sum, line) => {;
    const qty = line.quantity || 0;
    let price = line.unitPrice || 0;

    if (!line.unitPrice && line.itemType === 'SERVICE' && line.selectedService) {
        price = line.selectedService.price;
    }
    return sum + (qty * price);
    }, 0);
  }
  
  registerSale() {
    if (!this.sharedData.clientId) {
      this.notification.warning('Debe seleccionar un cliente.');
      return;
    }

    for (const line of this.saleLines) {
      if (line.itemType === 'SERVICE' && !line.serviceId) {
        this.notification.warning('Debe seleccionar un servicio en todas las líneas.');
        return;
      }
      if (line.itemType === 'PRODUCT') {
        if (!line.inventoryProductId) {
          this.notification.warning('Debe seleccionar un producto del inventario en todas las líneas.');
          return;
        }
        if (line.selectedProduct?.hasVariants && !line.inventoryProductVariantId) {
          this.notification.warning('Debe seleccionar una variante del producto en todas las líneas.');
          return;
        }
      }
      if (line.quantity <= 0) {
        this.notification.warning('La cantidad debe ser mayor a 0 en todas las líneas.');
        return;
      }
    }

    const requests = this.saleLines.map(line => {
      const payLoad: any = {
        clientId: Number(this.sharedData.clientId),
        itemType: line.itemType,
        quantity: Number(line.quantity),
        paymentMethod: this.sharedData.paymentMethod,
        saleDate: this.sharedData.saleDate,
        saleTime: '00:00:00',
        notes: this.sharedData.notes,
      };
      if (line.unitPrice) payLoad.unitPrice = Number(line.unitPrice);

      if (line.itemType === 'SERVICE') {
        payLoad.serviceId = Number(line.serviceId);
      } else {
        payLoad.inventoryProductId = Number(line.inventoryProductId);
        payLoad.inventoryProductVariantId = line.selectedProduct?.hasVariants ? Number(line.inventoryProductVariantId) : null;
      }
      return this.saleApi.createSale(payLoad);
    });

    this.isSubmitting = true;
    this.cdr.detectChanges();
    
    // Execute all requests in parallel
    forkJoin(requests).subscribe({
      next: () => {
        this.notification.success(`${requests.length} venta(s) registrada(s) correctamente.`, '¡Éxito!');
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
