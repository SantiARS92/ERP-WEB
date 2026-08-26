import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentMethod } from '../../core/models/sale.model';
import { Service } from '../../core/models/service.model';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { Client } from '../../core/models/client.model';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { ProductsStore } from '../../core/state/products.store';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSale implements OnInit {
  private saleApi = inject(SaleApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);
  private productsStore = inject(ProductsStore);

  private readonly servicesSignal = signal<Service[]>([]);
  private readonly productsSignal = signal<Product[]>([]);
  private readonly clientsSignal = signal<Client[]>([]);

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

  private readonly isSubmittingSignal = signal(false);

  get services() { return this.servicesSignal(); }
  set services(value: Service[]) { this.servicesSignal.set(value); }

  get products() { return this.productsSignal(); }
  set products(value: Product[]) { this.productsSignal.set(value); }

  get clients() { return this.clientsSignal(); }
  set clients(value: Client[]) { this.clientsSignal.set(value); }

  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }

  ngOnInit(): void {
    this.clientsStore.ensureLoaded().subscribe((clients) => { this.clients = clients; });
    this.servicesStore.ensureLoaded().subscribe((services) => { this.services = services.filter((service) => service.active); });
    this.productsStore.ensureLoaded().subscribe((products) => { this.products = products; });
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
    
    // Execute all requests in parallel
    forkJoin(requests).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success(`${requests.length} venta(s) registrada(s) correctamente.`, '¡Éxito!');
        this.router.navigate(['/ventas']);
      },
      error: (err) => {
        console.error('Error creando venta:', err);
        this.isSubmitting = false;
      }
    });
  }
}
